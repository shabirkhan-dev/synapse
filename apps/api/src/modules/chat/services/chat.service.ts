import {
	convertToModelMessages,
	generateId,
	isStepCount,
	safeValidateUIMessages,
	streamText,
	type LanguageModel,
	type UIMessage,
} from "ai";
import { CHAT_ASSISTANT_PROMPT } from "@synapse/generation";
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
		body,
		context,
		abortSignal,
	}: {
		ownerId: string;
		body: ChatBody;
		context: RequestContext;
		abortSignal?: AbortSignal;
	}) {
		const { rag, memory, guardrails, chatModel, maxSteps, topK, logger } = this.options;
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
			createChatTools({ rag, memory, guardrails, ownerId, topK, context }),
		);
		const result = streamText({
			model: chatModel,
			system: [CHAT_ASSISTANT_PROMPT.system, recalled].filter(Boolean).join("\n\n"),
			messages: await convertToModelMessages(validated, { tools }),
			tools,
			toolChoice: "auto",
			stopWhen: isStepCount(maxSteps),
			...(abortSignal ? { abortSignal } : {}),
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
										logger.error("chat reply not saved", { conversationId: storedIn, error }),
									);
							},
						}
					: {}),
			},
		};
	}
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
