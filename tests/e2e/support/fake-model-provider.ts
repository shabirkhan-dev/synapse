import { createServer } from "node:http";

/**
 * A stand-in OpenAI-compatible endpoint: fixed-size embeddings and one cited answer, so the suite
 * needs no model key and its answers are deterministic.
 */
const port = Number(process.argv[2] ?? 5601);
const DIMENSIONS = 1536;

createServer(async (request, response) => {
	let raw = "";
	for await (const chunk of request) raw += chunk;
	const body = raw ? (JSON.parse(raw) as { input?: string | string[] }) : {};
	response.setHeader("content-type", "application/json");

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
