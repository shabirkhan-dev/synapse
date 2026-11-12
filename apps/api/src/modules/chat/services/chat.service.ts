import {
	convertToModelMessages,
	generateId,
	isStepCount,
	safeValidateUIMessages,
	streamText,
	type LanguageModel,
	type LanguageModelUsage,
	type StepResult,
	type ToolSet,
	type UIMessage,
} from "ai";
import { AUDIT_ACTIONS, type AuditLog } from "@synapse/audit";
import type { ModelInfo } from "@synapse/core/contracts";
import { CHAT_ASSISTANT_PROMPT, promptVersion } from "@synapse/generation";
import type { Logger } from "@synapse/observability";

import type { GuardrailsService } from "@/modules/guardrails";
import type { MemoryService } from "@/modules/memory";
import type { RagService } from "@/modules/rag";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { RequestContext } from "@/shared/types/app-types";

import { CHAT_ERROR_CODES } from "../constants/chat.constants";
import type { ChatBody } from "../schemas/chat.schemas";
import { createChatTools } from "../tools/chat.tools";

export type ChatServiceOptions = {
	rag: RagService;
	memory: MemoryService;
	guardrails: GuardrailsService;
	chatModel: LanguageModel;
	/** `provider` + `model` of `chatModel`, recorded as each answer's provenance. */
	chatInfo: ModelInfo;
	audit: AuditLog;
	maxSteps: number;
	topK: number;
	logger: Logger;
};

/**
 * Runs one tool-calling chat turn for a user. Stateless (`messages`) or stored (`message` +
 * optional `conversationId`: history is loaded, and the reply saved when the stream ends).
 * Facts the user asked to remember are recalled into the system prompt as data.
 */
export class ChatService {
	constructor(private readonly options: ChatServiceOptions) {}

	async streamReply({
		ownerId,
		organizationId,
		body,
		context,
		abortSignal,
	}: {
		/** The user: conversations and facts are per user. */
		ownerId: string;
		/** Active organization: document search is scoped to it. */
		organizationId: string;
		body: ChatBody;
		context: RequestContext;
		abortSignal?: AbortSignal;
	}) {
		const { rag, memory, guardrails, chatModel, maxSteps, topK } = this.options;
		let conversationId: string | null = null;
		let messages: unknown[] = body.messages ?? [];
		if (body.message) {
			const [message] = await validate([body.message]);
			if (!message) {
				throw invalidMessages("Missing message");
			}
			// Before anything is stored or sent to the model.
			await guardrails.checkInput(ownerId, lastUserText([message]), "chat.message", context);
			const continued = await memory.continueConversation(ownerId, body.conversationId, {
				id: message.id,
				role: message.role,
				message: { ...message },
			});
			conversationId = continued.conversationId;
			messages = continued.history;
		}
		const validated = await validate(messages);
		if (!body.message) {
			await guardrails.checkInput(ownerId, lastUserText(validated), "chat.message", context);
		}
		const recalled = await memory.recallContext(ownerId, lastUserText(validated));
		const tools = guardrails.allowedTools(
			createChatTools({ rag, memory, guardrails, ownerId, organizationId, topK, context }),
		);
		const result = streamText({
			model: chatModel,
			system: [CHAT_ASSISTANT_PROMPT.system, recalled].filter(Boolean).join("\n\n"),
			messages: await convertToModelMessages(validated, { tools }),
			tools,
			toolChoice: "auto",
			stopWhen: isStepCount(maxSteps),
			...(abortSignal ? { abortSignal } : {}),
			// Every answer is traceable (architecture rule 6), a stopped one too: its finished steps.
			onEnd: ({ steps, totalUsage, finishReason }) =>
				this.recordAnswer({
					ownerId,
					organizationId,
					conversationId,
					context,
					steps,
					usage: totalUsage,
					finishReason,
				}),
			onAbort: ({ steps }) =>
				this.recordAnswer({
					ownerId,
					organizationId,
					conversationId,
					context,
					steps,
					usage: sumUsage(steps),
					finishReason: "aborted",
				}),
		});
		const storedIn = conversationId;
		return {
			result,
			conversationId,
			/** Options for `toUIMessageStreamResponse`: ids for new messages, and saving the reply. */
			stream: {
				originalMessages: validated,
				generateMessageId: generateId,
				...(storedIn
					? {
							onFinish: async ({ messages: finished }: { messages: UIMessage[] }) => {
								// The stream is already sent: a failed save is logged, not thrown.
								await memory
									.saveMessages(
										ownerId,
										storedIn,
										finished.map((message) => ({
											id: message.id,
											role: message.role,
											message: { ...message },
										})),
									)
									.catch((error: unknown) =>
										this.options.logger.error("chat reply not saved", {
											conversationId: storedIn,
											error,
										}),
									);
							},
						}
					: {}),
			},
		};
	}

	/**
	 * Writes `chat.message.answered` with provenance once the stream ends or is stopped. The reply
	 * has already been sent, so a failed write is logged (the RAG path fails the request instead).
	 */
	private async recordAnswer({
		ownerId,
		organizationId,
		conversationId,
		context,
		steps,
		usage,
		finishReason,
	}: {
		ownerId: string;
		organizationId: string;
		conversationId: string | null;
		context: RequestContext;
		steps: ReadonlyArray<StepResult<ToolSet>>;
		usage: TokenCounts;
		finishReason: string;
	}): Promise<void> {
		const { audit, chatInfo, rag, logger } = this.options;
		const tools = [
			...new Set(steps.flatMap((step) => step.toolCalls.map((call) => call.toolName))),
		];
		try {
			await audit.record({
				ownerId: organizationId,
				actorId: context.actorId ?? ownerId,
				action: AUDIT_ACTIONS.CHAT_MESSAGE_ANSWERED,
				subjectType: "conversation",
				subjectId: conversationId,
				requestId: context.requestId,
				data: { finishReason, steps: steps.length, tools },
				provenance: {
					chatModel: `${chatInfo.provider}:${chatInfo.model}`,
					promptVersion: promptVersion(CHAT_ASSISTANT_PROMPT),
					...rag.versions,
					usage: {
						...(usage.inputTokens === undefined ? {} : { inputTokens: usage.inputTokens }),
						...(usage.outputTokens === undefined ? {} : { outputTokens: usage.outputTokens }),
					},
				},
			});
		} catch (error) {
			logger.error("chat answer not recorded", {
				conversationId,
				requestId: context.requestId,
				error,
			});
		}
	}
}

type TokenCounts = Pick<LanguageModelUsage, "inputTokens" | "outputTokens">;

/** Summed token use of the steps that finished (a stopped stream reports no total). */
function sumUsage(steps: ReadonlyArray<{ usage: LanguageModelUsage }>): TokenCounts {
	let inputTokens = 0;
	let outputTokens = 0;
	for (const { usage } of steps) {
		inputTokens += usage.inputTokens ?? 0;
		outputTokens += usage.outputTokens ?? 0;
	}
	return { inputTokens, outputTokens };
}

async function validate(messages: unknown[]): Promise<UIMessage[]> {
	const validated = await safeValidateUIMessages<UIMessage>({ messages });
	if (!validated.success) {
		throw invalidMessages(validated.error.message);
	}
	return validated.data;
}

function invalidMessages(message: string): AppError {
	return new AppError({
		statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
		code: CHAT_ERROR_CODES.INVALID_MESSAGES,
		message,
	});
}

/** Text of the newest user message: the query for recalling remembered facts. */
function lastUserText(messages: UIMessage[]): string {
	const last = messages.findLast((message) => message.role === "user");
	return (last?.parts ?? [])
		.map((part) => (part.type === "text" ? part.text : ""))
		.join(" ")
		.trim();
}
