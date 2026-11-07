import {
	convertToModelMessages,
	isStepCount,
	safeValidateUIMessages,
	streamText,
	type LanguageModel,
	type UIMessage,
} from "ai";
import { CHAT_ASSISTANT_PROMPT } from "@synapse/generation";

import type { RagService } from "@/modules/rag";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";

import { CHAT_ERROR_CODES } from "../constants/chat.constants";
import { createChatTools } from "../tools/chat.tools";

export type ChatServiceOptions = {
	rag: RagService;
	chatModel: LanguageModel;
	maxSteps: number;
	topK: number;
};

/** Runs one tool-calling chat turn for a user. Returns the AI SDK stream; the route sends it. */
export class ChatService {
	constructor(private readonly options: ChatServiceOptions) {}

	async streamReply({
		ownerId,
		messages,
		abortSignal,
	}: {
		ownerId: string;
		messages: unknown[];
		abortSignal?: AbortSignal;
	}) {
		const validated = await safeValidateUIMessages<UIMessage>({ messages });
		if (!validated.success) {
			throw new AppError({
				statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
				code: CHAT_ERROR_CODES.INVALID_MESSAGES,
				message: validated.error.message,
			});
		}
		const { rag, chatModel, maxSteps, topK } = this.options;
		const tools = createChatTools({ rag, ownerId, topK });
		return streamText({
			model: chatModel,
			system: CHAT_ASSISTANT_PROMPT.system,
			messages: await convertToModelMessages(validated.data, { tools }),
			tools,
			toolChoice: "auto",
			stopWhen: isStepCount(maxSteps),
			...(abortSignal ? { abortSignal } : {}),
		});
	}
}
