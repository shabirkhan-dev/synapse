import { AiNetworkIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { isTextUIPart, isToolUIPart } from "ai";

import { Markdown } from "@/components/shared/markdown";

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
						<AssistantLabel />
						{message.parts.map((part, index) =>
							isTextUIPart(part) ? (
								// oxlint-disable-next-line react/no-array-index-key -- text parts carry no id
								<Markdown key={index} text={part.text} />
							) : isToolUIPart(part) ? (
								<ToolCall key={part.toolCallId} part={part} />
							) : null,
						)}
					</li>
				),
			)}
			{waiting ? (
				<li className="flex flex-col gap-2">
					<AssistantLabel />
					<p className="text-sm text-muted-foreground">Thinking…</p>
				</li>
			) : null}
		</ol>
	);
}

/** "Synapse" with the product mark, above each reply. */
function AssistantLabel() {
	return (
		<p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
			<span
				aria-hidden="true"
				className="flex size-5 items-center justify-center rounded-md bg-primary text-primary-foreground"
			>
				<HugeiconsIcon icon={AiNetworkIcon} size={12} strokeWidth={2} />
			</span>
			Synapse
		</p>
	);
}

function textOf(message: ChatMessage): string {
	return message.parts
		.filter(isTextUIPart)
		.map((part) => part.text)
		.join("");
}
