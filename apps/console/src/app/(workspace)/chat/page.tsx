import type { Metadata } from "next";
import { Suspense } from "react";

import { ChatContainer } from "@/features/chat";

export const metadata: Metadata = { title: "Chat · Synapse Console" };

/** The chat reads the open conversation from the address, which needs a Suspense boundary. */
export default function ChatPage() {
	return (
		<Suspense fallback={null}>
			<ChatContainer />
		</Suspense>
	);
}
