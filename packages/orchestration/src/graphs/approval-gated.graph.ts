import {
	Annotation,
	type BaseCheckpointSaver,
	Command,
	END,
	interrupt,
	type LangGraphRunnableConfig,
	START,
	StateGraph,
} from "@langchain/langgraph";

/** A reviewer's answer; `approved: false` ends the run without running the action. */
export type ApprovalDecision = { approved: boolean; decidedBy: string; reason?: string };

export type ApprovalGatedPorts<TInput, TResult> = {
	/**
	 * Record the approval request. `approvalId` is the run's thread id, so repeating this step
	 * (after a crash) must be a no-op for an existing id.
	 */
	requestApproval(input: { approvalId: string; input: TInput }): Promise<void>;
	/** The gated action; runs only after an approval, at most once per finished run. */
	execute(input: TInput): Promise<TResult>;
};

export type ApprovalGatedOutcome<TResult> =
	| { status: "awaiting_approval"; approvalId: string }
	| { status: "rejected"; approvalId: string }
	| { status: "done"; approvalId: string; result: TResult };

const RECURSION_LIMIT = 10;

const threadConfig = (threadId: string) => ({
	recursionLimit: RECURSION_LIMIT,
	configurable: { thread_id: threadId },
});

/**
 * request approval → pause (LangGraph `interrupt`, checkpointed) → on the decision: execute or stop.
 * The pause survives restarts: `decide` may run in any process that shares the checkpointer.
 */
export function createApprovalGatedGraph<TInput, TResult>({
	ports,
	checkpointer,
}: {
	ports: ApprovalGatedPorts<TInput, TResult>;
	/** Required: the paused run lives in the checkpoints until someone decides. */
	checkpointer: BaseCheckpointSaver;
}) {
	const State = Annotation.Root({
		input: Annotation<TInput>(),
		decision: Annotation<ApprovalDecision | null>(),
		result: Annotation<TResult | null>(),
	});

	const graph = new StateGraph(State)
		.addNode("request_approval", async ({ input }, config: LangGraphRunnableConfig) => {
			const approvalId = String(config.configurable?.thread_id);
			await ports.requestApproval({ approvalId, input });
			return { decision: null, result: null };
		})
		.addNode("await_decision", () => ({
			decision: interrupt<{ waitingFor: string }, ApprovalDecision>({ waitingFor: "approval" }),
		}))
		.addNode("execute", async ({ input }) => ({ result: await ports.execute(input) }))
		.addEdge(START, "request_approval")
		.addEdge("request_approval", "await_decision")
		.addConditionalEdges(
			"await_decision",
			({ decision }) => (decision?.approved ? "execute" : END),
			["execute", END],
		)
		.addEdge("execute", END)
		.compile({ checkpointer });

	async function outcome(approvalId: string): Promise<ApprovalGatedOutcome<TResult>> {
		const snapshot = await graph.getState(threadConfig(approvalId));
		if (snapshot.next.length > 0) {
			return { status: "awaiting_approval", approvalId };
		}
		const state = snapshot.values as typeof State.State;
		if (state.decision?.approved) {
			return { status: "done", approvalId, result: state.result as TResult };
		}
		return { status: "rejected", approvalId };
	}

	return {
		/** Start a run that waits for approval. `approvalId` must be new (e.g. a UUID). */
		async start(approvalId: string, input: TInput): Promise<ApprovalGatedOutcome<TResult>> {
			await graph.invoke({ input }, threadConfig(approvalId));
			return outcome(approvalId);
		},
		/**
		 * Deliver a decision and run to the end. Repeating it after the run finished just returns
		 * the outcome (e.g. a retry after a crash between storing the decision and resuming).
		 */
		async decide(
			approvalId: string,
			decision: ApprovalDecision,
		): Promise<ApprovalGatedOutcome<TResult>> {
			const current = await outcome(approvalId);
			if (current.status !== "awaiting_approval") {
				return current;
			}
			await graph.invoke(new Command({ resume: decision }), threadConfig(approvalId));
			return outcome(approvalId);
		},
		outcome,
	};
}

export type ApprovalGatedGraph<TInput, TResult> = ReturnType<
	typeof createApprovalGatedGraph<TInput, TResult>
>;
