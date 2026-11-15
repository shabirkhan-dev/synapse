import type { StreamTextTransform, TextStreamPart, ToolSet } from "ai";

import type { StreamRedactor } from "@synapse/guardrails";

type Streamed = TextStreamPart<ToolSet>;

/**
 * A `streamText` transform that replaces secrets in the reply's text and reasoning before they
 * reach the client (and the stored conversation). Each text part has its own redactor, flushed at
 * its end; `onRedacted` runs once, after the stream, if anything was replaced.
 */
export function redactSecretsInStream({
	createRedactor,
	onRedacted,
}: {
	createRedactor: () => StreamRedactor;
	onRedacted: () => void;
}): StreamTextTransform<ToolSet> {
	return () => {
		const redactors = new Map<string, StreamRedactor>();
		const redactorFor = (key: string) => {
			let redactor = redactors.get(key);
			if (!redactor) {
				redactor = createRedactor();
				redactors.set(key, redactor);
			}
			return redactor;
		};
		const delta = (type: "text-delta" | "reasoning-delta", id: string, text: string): Streamed =>
			({ type, id, text }) as Streamed;

		return new TransformStream<Streamed, Streamed>({
			transform(part, controller) {
				if (part.type === "text-delta" || part.type === "reasoning-delta") {
					const text = redactorFor(`${part.type}:${part.id}`).push(part.text);
					if (text) controller.enqueue({ ...part, text });
					return;
				}
				if (part.type === "text-end" || part.type === "reasoning-end") {
					const type = part.type === "text-end" ? "text-delta" : "reasoning-delta";
					const rest = redactors.get(`${type}:${part.id}`)?.flush();
					if (rest) controller.enqueue(delta(type, part.id, rest));
				}
				controller.enqueue(part);
			},
			flush() {
				if ([...redactors.values()].some((redactor) => redactor.redacted)) onRedacted();
			},
		});
	};
}
