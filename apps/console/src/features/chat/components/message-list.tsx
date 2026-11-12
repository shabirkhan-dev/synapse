import { isTextUIPart, isToolUIPart } from "ai";

import type { ChatMessage, ChatPart } from "../types/chat.types";
import { ToolCall } from "./tool-call";

export type MessageListProps = {
	messages: ChatMessage[];
	/** The last assistant message is still arriving. */
	streaming: boolean;
};

const visible = (part: ChatPart) => isTextUIPart(part) || isToolUIPart(part);

/** The conversation, oldest first: your messages on the trailing side, Synapse's on the leading. */
export function MessageList({ messages, streaming }: MessageListProps) {
	const shown = messages.filter(
		(message) =>
			message.role === "user" || (message.role === "assistant" && message.parts.some(visible)),
	);
	const waiting = streaming && shown.at(-1)?.role !== "assistant";

	return (
		<ol aria-label="Messages" className="flex flex-col gap-6">
			{shown.map((message) =>
				message.role === "user" ? (
					<li key={message.id} className="flex justify-end">
						<div className="max-w-[min(85%,42rem)] rounded-xl bg-muted px-3 py-2 text-sm leading-relaxed">
							<span className="sr-only">You: </span>
							<p className="break-words whitespace-pre-wrap">{textOf(message)}</p>
						</div>
					</li>
				) : (
					<li key={message.id} className="flex max-w-2xl flex-col gap-2">
						<p className="text-xs font-medium text-muted-foreground">Synapse</p>
						{message.parts.map((part, index) =>
							isTextUIPart(part) ? (
								<p
									// oxlint-disable-next-line react/no-array-index-key -- text parts carry no id
									key={index}
									className="text-sm leading-relaxed text-pretty break-words whitespace-pre-wrap"
								>
									{part.text}
								</p>
							) : isToolUIPart(part) ? (
								<ToolCall key={part.toolCallId} part={part} />
							) : null,
						)}
					</li>
				),
			)}
			{waiting ? (
				<li className="flex flex-col gap-2">
					<p className="text-xs font-medium text-muted-foreground">Synapse</p>
					<p className="text-sm text-muted-foreground">Thinking…</p>
				</li>
			) : null}
		</ol>
	);
}

function textOf(message: ChatMessage): string {
	return message.parts
		.filter(isTextUIPart)
		.map((part) => part.text)
		.join("");
}
