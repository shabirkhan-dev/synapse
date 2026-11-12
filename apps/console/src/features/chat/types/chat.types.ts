import type { UIMessage } from "ai";
import type { z } from "zod";

import type { conversationSchema } from "../schemas/chat.schema";

export type Conversation = z.infer<typeof conversationSchema>;
export type ChatMessage = UIMessage;
export type ChatPart = ChatMessage["parts"][number];

/** A thread's state: nothing running, an answer streaming in, or the last turn failed. */
export type ThreadStatus =
	| { kind: "idle" }
	| { kind: "streaming" }
	| { kind: "failed"; message: string; draft: string };
