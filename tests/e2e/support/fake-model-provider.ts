import { createServer } from "node:http";

/**
 * A stand-in OpenAI-compatible endpoint: fixed-size embeddings and one cited answer, so the suite
 * needs no model key and its answers are deterministic. Streaming chat (`stream: true`, the
 * console's chat page) first calls `searchDocuments` with the user's words, then streams
 * `STREAMED_ANSWER` in a few chunks. The chaos suite (`tests/system`) injects faults with
 * `POST /__fault { delayMs?, status?, only? }`: model calls (or `only` chat or embeddings) then
 * wait, and fail with `status`.
 */
const port = Number(process.argv[2] ?? 5601);
const DIMENSIONS = 1536;
const STREAMED_ANSWER = ["Refunds ", "are accepted ", "within 30 days ", "of purchase."];

type Fault = { delayMs?: number; status?: number; only?: "chat" | "embeddings" };
let fault: Fault = {};

type ChatRequest = {
	stream?: boolean;
	tools?: { function?: { name?: string } }[];
	messages?: { role: string; content?: unknown }[];
};

const sseChunk = (delta: Record<string, unknown>, finish: string | null = null) =>
	`data: ${JSON.stringify({
		id: "e2e-stream",
		object: "chat.completion.chunk",
		created: 1_700_000_000,
		model: "fake-chat",
		choices: [{ index: 0, delta, finish_reason: finish }],
		...(finish ? { usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 } } : {}),
	})}\n\n`;

function lastUserText(messages: ChatRequest["messages"] = []): string {
	const content = messages.findLast((message) => message.role === "user")?.content;
	if (typeof content === "string") return content;
	return Array.isArray(content)
		? content.map((part: { text?: string }) => part.text ?? "").join(" ")
		: "";
}

async function streamChat(request: ChatRequest, response: import("node:http").ServerResponse) {
	response.setHeader("content-type", "text/event-stream");
	const searched = request.messages?.some((message) => message.role === "tool");
	const canSearch = request.tools?.some((tool) => tool.function?.name === "searchDocuments");
	if (canSearch && !searched) {
		const args = JSON.stringify({ query: lastUserText(request.messages).slice(0, 80) });
		response.write(
			sseChunk({
				role: "assistant",
				tool_calls: [
					{
						index: 0,
						id: "call_e2e",
						type: "function",
						function: { name: "searchDocuments", arguments: args },
					},
				],
			}),
		);
		response.write(sseChunk({}, "tool_calls"));
	} else {
		for (const [index, text] of STREAMED_ANSWER.entries()) {
			response.write(
				sseChunk(index === 0 ? { role: "assistant", content: text } : { content: text }),
			);
			// oxlint-disable-next-line no-await-in-loop -- chunks are spaced so the stream is visible
			await new Promise((resolve) => setTimeout(resolve, 150));
		}
		response.write(sseChunk({}, "stop"));
	}
	response.end("data: [DONE]\n\n");
}

createServer(async (request, response) => {
	let raw = "";
	for await (const chunk of request) raw += chunk;
	const body = raw ? (JSON.parse(raw) as { input?: string | string[] }) : {};
	response.setHeader("content-type", "application/json");

	if (request.url === "/__fault" && request.method === "POST") {
		fault = body as Fault;
		response.end("{}");
		return;
	}
	const kind = request.url?.endsWith("/embeddings")
		? "embeddings"
		: request.url?.endsWith("/chat/completions")
			? "chat"
			: undefined;
	const isModelCall = kind !== undefined && (!fault.only || fault.only === kind);
	if (isModelCall && fault.delayMs) {
		await new Promise((resolve) => setTimeout(resolve, fault.delayMs));
	}
	if (isModelCall && fault.status) {
		response.statusCode = fault.status;
		response.end(JSON.stringify({ error: { message: "injected fault", type: "server_error" } }));
		return;
	}

	if (request.url?.endsWith("/embeddings")) {
		const inputs = Array.isArray(body.input) ? body.input : [body.input ?? ""];
		response.end(
			JSON.stringify({
				object: "list",
				model: "fake-embedding",
				data: inputs.map((_, index) => ({
					object: "embedding",
					index,
					embedding: Array.from({ length: DIMENSIONS }, () => 0.01),
				})),
				usage: { prompt_tokens: 1, total_tokens: 1 },
			}),
		);
		return;
	}
	if (request.url?.endsWith("/chat/completions") && (body as ChatRequest).stream) {
		await streamChat(body as ChatRequest, response);
		return;
	}
	if (request.url?.endsWith("/chat/completions")) {
		response.end(
			JSON.stringify({
				id: "e2e",
				object: "chat.completion",
				created: 1_700_000_000,
				model: "fake-chat",
				choices: [
					{
						index: 0,
						message: { role: "assistant", content: "Within 30 days [1]." },
						finish_reason: "stop",
					},
				],
				usage: { prompt_tokens: 20, completion_tokens: 6, total_tokens: 26 },
			}),
		);
		return;
	}
	if (request.url === "/health") {
		response.end("{}");
		return;
	}
	response.statusCode = 404;
	response.end("{}");
}).listen(port);
