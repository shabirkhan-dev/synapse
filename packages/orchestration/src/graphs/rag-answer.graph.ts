import { Annotation, type BaseCheckpointSaver, END, START, StateGraph } from "@langchain/langgraph";

/** What a generated answer must expose for the citation check. */
export type CitedAnswer = { citations: readonly unknown[] };

/** `TContext` is the caller's per-run data (e.g. owner and topK), passed to every port as is. */
export type RagAnswerPorts<TPassage, TAnswer extends CitedAnswer, TContext = undefined> = {
	retrieve(input: { question: string; context: TContext }): Promise<TPassage[]>;
	/** `attempt` starts at 1; later attempts should insist on citations (a stricter prompt). */
	answer(input: {
		question: string;
		passages: TPassage[];
		attempt: number;
		context: TContext;
	}): Promise<TAnswer>;
};

export type RagAnswerGraphOptions<TPassage, TAnswer extends CitedAnswer, TContext = undefined> = {
	ports: RagAnswerPorts<TPassage, TAnswer, TContext>;
	/** Generations allowed per question (default 2: one retry when the answer cites nothing). */
	maxAttempts?: number;
	/** Persist each step, so a crashed run resumes with `resume(threadId)`; omit for in-request runs. */
	checkpointer?: BaseCheckpointSaver;
};

export type RagAnswerRun<TPassage, TAnswer> = {
	passages: TPassage[];
	/** `null` when nothing was retrieved (no model call was made). */
	answer: TAnswer | null;
	attempts: number;
};

/** Bound on graph steps; this graph needs at most 1 + maxAttempts. */
const RECURSION_LIMIT = 10;

/** Invoke options: the step bound, plus the thread to checkpoint under when there is one. */
const config = (threadId?: string) => ({
	recursionLimit: RECURSION_LIMIT,
	...(threadId ? { configurable: { thread_id: threadId } } : {}),
});

/**
 * retrieve → generate → (no citations and attempts left? generate again) → end.
 * Steps are checkpointed per thread when a checkpointer is given: after a crash, `resume` continues
 * from the last finished step instead of retrieving and generating again.
 */
export function createRagAnswerGraph<TPassage, TAnswer extends CitedAnswer, TContext = undefined>({
	ports,
	maxAttempts = 2,
	checkpointer,
}: RagAnswerGraphOptions<TPassage, TAnswer, TContext>) {
	const State = Annotation.Root({
		question: Annotation<string>(),
		/** Checkpointed with the run, so it must be JSON-serializable. */
		context: Annotation<TContext>(),
		passages: Annotation<TPassage[]>(),
		answer: Annotation<TAnswer | null>(),
		attempts: Annotation<number>(),
	});

	const graph = new StateGraph(State)
		.addNode("retrieve", async ({ question, context }) => ({
			passages: await ports.retrieve({ question, context }),
			answer: null,
			attempts: 0,
		}))
		.addNode("generate", async ({ question, context, passages, attempts }) => {
			const attempt = attempts + 1;
			const answer = await ports.answer({ question, passages, attempt, context });
			return { answer, attempts: attempt };
		})
		.addEdge(START, "retrieve")
		.addConditionalEdges("retrieve", ({ passages }) => (passages.length > 0 ? "generate" : END), [
			"generate",
			END,
		])
		.addConditionalEdges(
			"generate",
			({ answer, attempts }) =>
				(answer?.citations.length ?? 0) > 0 || attempts >= maxAttempts ? END : "generate",
			["generate", END],
		)
		.compile(checkpointer ? { checkpointer } : {});

	const toRun = (state: typeof State.State): RagAnswerRun<TPassage, TAnswer> => ({
		passages: state.passages,
		answer: state.answer,
		attempts: state.attempts,
	});

	return {
		/** Answer `question`. With a checkpointer, `threadId` names the run so it can be resumed. */
		async run(
			input: { question: string; context: TContext },
			threadId?: string,
		): Promise<RagAnswerRun<TPassage, TAnswer>> {
			return toRun(await graph.invoke(input, config(threadId)));
		},
		/** Continue a checkpointed run that stopped (crash, deploy) from its last finished step. */
		async resume(threadId: string): Promise<RagAnswerRun<TPassage, TAnswer>> {
			if (!checkpointer) {
				throw new Error("resume needs a checkpointer");
			}
			return toRun(await graph.invoke(null, config(threadId)));
		},
	};
}

export type RagAnswerGraph<
	TPassage,
	TAnswer extends CitedAnswer,
	TContext = undefined,
> = ReturnType<typeof createRagAnswerGraph<TPassage, TAnswer, TContext>>;
