import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ChatComposer } from "@/features/chat/components/chat-composer";
import { ConversationList } from "@/features/chat/components/conversation-list";
import { MessageList } from "@/features/chat/components/message-list";
import { ChatThreadContainer } from "@/features/chat/containers/chat-thread-container";
import type { ChatMessage } from "@/features/chat/types/chat.types";
import { setAccessToken } from "@/lib/api/session";

import { failure, mockFetch, renderWithQuery, signedIn } from "./helpers";

afterEach(() => {
	cleanup();
	setAccessToken(null);
});

const user = (id: string, text: string): ChatMessage => ({
	id,
	role: "user",
	parts: [{ type: "text", text }],
});

const searched = (state: "output-available" | "output-error"): ChatMessage =>
	({
		id: "a1",
		role: "assistant",
		parts: [
			{
				type: "tool-searchDocuments",
				toolCallId: "call-1",
				state,
				input: { query: "refunds" },
				...(state === "output-available"
					? { output: [{ title: "Refund policy" }, { title: "Refund policy" }] }
					: { errorText: "boom" }),
			},
			{ type: "text", text: "Within 30 days." },
		],
	}) as unknown as ChatMessage;

/** The API's chat response: an AI SDK UI message stream over server-sent events. */
function sse(chunks: object[], headers: Record<string, string> = {}): Response {
	const body = [...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`), "data: [DONE]\n\n"];
	return new Response(
		new ReadableStream({
			start(controller) {
				for (const part of body) controller.enqueue(new TextEncoder().encode(part));
				controller.close();
			},
		}),
		{ headers: { "content-type": "text/event-stream", ...headers } },
	);
}

const ANSWER = [
	{ type: "start", messageId: "m1" },
	{ type: "start-step" },
	{ type: "text-start", id: "t1" },
	{ type: "text-delta", id: "t1", delta: "Within " },
	{ type: "text-delta", id: "t1", delta: "30 days." },
	{ type: "text-end", id: "t1" },
	{ type: "finish-step" },
	{ type: "finish" },
];

describe("MessageList", () => {
	test("shows your message, the search Synapse ran with its sources, and the answer", () => {
		render(
			<MessageList
				messages={[user("u1", "How long?"), searched("output-available")]}
				streaming={false}
			/>,
		);
		expect(screen.getByText("How long?")).toBeDefined();
		expect(screen.getByText(/Searched your documents/)).toBeDefined();
		expect(screen.getByText(/for “refunds”/)).toBeDefined();
		expect(screen.getByText(/2 passages/)).toBeDefined();
		// Two passages from one document list it once.
		expect(screen.getAllByText("Refund policy")).toHaveLength(1);
		expect(screen.getByText("Within 30 days.")).toBeDefined();
		expect(screen.queryByText("Thinking…")).toBeNull();
	});

	test("says a failed search failed, in words and not only color", () => {
		render(<MessageList messages={[searched("output-error")]} streaming={false} />);
		expect(screen.getByText(/Document search failed/)).toBeDefined();
	});

	test("shows Thinking… until the first part of the answer arrives", () => {
		render(<MessageList messages={[user("u1", "Hi")]} streaming />);
		expect(screen.getByText("Thinking…")).toBeDefined();
	});
});

describe("ChatComposer", () => {
	test("Enter sends the trimmed text and clears the box; Shift+Enter does not send", () => {
		const onSend = mock();
		render(<ChatComposer streaming={false} draft="" onSend={onSend} onStop={mock()} />);
		const box = screen.getByLabelText("Message") as HTMLTextAreaElement;
		fireEvent.change(box, { target: { value: "  Hello  " } });
		fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
		expect(onSend).not.toHaveBeenCalled();
		fireEvent.keyDown(box, { key: "Enter" });
		expect(onSend).toHaveBeenCalledWith("Hello");
		expect(box.value).toBe("");
	});

	test("an empty message explains itself instead of sending", () => {
		const onSend = mock();
		render(<ChatComposer streaming={false} draft="" onSend={onSend} onStop={mock()} />);
		fireEvent.click(screen.getByRole("button", { name: "Send" }));
		expect(onSend).not.toHaveBeenCalled();
		expect(screen.getByText("Type a message to send.")).toBeDefined();
		expect(screen.getByLabelText("Message").getAttribute("aria-invalid")).toBe("true");
	});

	test("while an answer streams, Stop replaces Send", () => {
		const onStop = mock();
		render(<ChatComposer streaming draft="" onSend={mock()} onStop={onStop} />);
		expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Stop" }));
		expect(onStop).toHaveBeenCalled();
	});
});

describe("ConversationList", () => {
	test("links each conversation, marks the open one, and deletes only after confirming", async () => {
		const onDelete = mock();
		const conversation = {
			id: "c1",
			title: "Refunds",
			createdAt: "x",
			updatedAt: "2026-11-12T10:00:00Z",
		};
		render(
			<ConversationList
				conversations={[conversation]}
				activeId="c1"
				deletingId={null}
				onNewChat={mock()}
				onOpen={mock()}
				onDelete={onDelete}
			/>,
		);
		const link = screen.getByRole("link", { name: /Refunds/ });
		expect(link.getAttribute("href")).toBe("/chat?c=c1");
		expect(link.getAttribute("aria-current")).toBe("page");
		fireEvent.click(screen.getByRole("button", { name: "Delete conversation “Refunds”" }));
		expect(onDelete).not.toHaveBeenCalled();
		fireEvent.click(await screen.findByRole("button", { name: "Delete conversation" }));
		expect(onDelete).toHaveBeenCalledWith(conversation);
	});
});

describe("ChatThreadContainer (mocked API)", () => {
	test("streams the answer in and reports the conversation the API started", async () => {
		signedIn();
		const calls = mockFetch(() => sse(ANSWER, { "x-conversation-id": "conv-1" }));
		const onStarted = mock();
		renderWithQuery(
			<ChatThreadContainer conversationId={null} initialMessages={[]} onStarted={onStarted} />,
		);
		fireEvent.change(screen.getByLabelText("Message"), { target: { value: "How long?" } });
		fireEvent.click(screen.getByRole("button", { name: "Send" }));

		await screen.findByText("Within 30 days.");
		expect(screen.getByText("How long?")).toBeDefined();
		expect(onStarted).toHaveBeenCalledWith("conv-1");
		const sent = calls.find((call) => call.url.endsWith("/chat"));
		const body = sent?.body as {
			message: { role: string; parts: unknown[] };
			conversationId?: string;
		};
		expect(body.message.role).toBe("user");
		expect(body.message.parts).toEqual([{ type: "text", text: "How long?" }]);
		expect(body.conversationId).toBeUndefined();
		expect(sent?.headers.get("authorization")).toBe("Bearer access-1");
		await screen.findByRole("button", { name: "Send" });
	});

	test("a stored conversation sends its id with the next message", async () => {
		signedIn();
		const calls = mockFetch(() => sse(ANSWER));
		renderWithQuery(
			<ChatThreadContainer
				conversationId="conv-9"
				initialMessages={[user("u0", "Earlier question")]}
				onStarted={mock()}
			/>,
		);
		expect(screen.getByText("Earlier question")).toBeDefined();
		fireEvent.change(screen.getByLabelText("Message"), { target: { value: "And now?" } });
		fireEvent.click(screen.getByRole("button", { name: "Send" }));
		await screen.findByText("Within 30 days.");
		expect(calls[0]?.body).toMatchObject({ conversationId: "conv-9" });
	});

	test("a refused message is taken back and returned to the box with the reason", async () => {
		signedIn();
		mockFetch(() => failure(422, "GUARDRAILS_INPUT_BLOCKED", "This message is not allowed."));
		renderWithQuery(
			<ChatThreadContainer conversationId={null} initialMessages={[]} onStarted={mock()} />,
		);
		fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Bad words" } });
		fireEvent.click(screen.getByRole("button", { name: "Send" }));

		await screen.findByText("Synapse could not answer");
		expect(screen.getByText(/This message is not allowed\./)).toBeDefined();
		await waitFor(() =>
			expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toBe("Bad words"),
		);
		expect(screen.queryByRole("list", { name: "Messages" })).toBeNull();
	});
});
