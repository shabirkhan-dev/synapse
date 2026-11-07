import { describe, expect, test } from "bun:test";

import { createLogger, type LogLevel, startTracing, withSpan } from "../src";

function capture() {
	const lines: { line: string; level: LogLevel }[] = [];
	return { lines, sink: (line: string, level: LogLevel) => lines.push({ line, level }) };
}

const now = () => new Date("2026-11-07T12:00:00.000Z");

describe("logger", () => {
	test("json lines carry service, level, message and fields; errors are serialized", () => {
		const { lines, sink } = capture();
		const logger = createLogger({ service: "api", format: "json", sink, now });
		logger.error("boom", { requestId: "req_1", error: new Error("bad") });
		const record = JSON.parse(lines[0]?.line ?? "{}");
		expect(record).toMatchObject({
			time: "2026-11-07T12:00:00.000Z",
			level: "ERROR",
			service: "api",
			msg: "boom",
			requestId: "req_1",
			error: { name: "Error", message: "bad" },
		});
		expect(lines[0]?.level).toBe("ERROR");
	});

	test("pretty lines are readable key=value pairs", () => {
		const { lines, sink } = capture();
		createLogger({ service: "api", sink, now }).info("request", { status: 200, path: "/x" });
		expect(lines[0]?.line).toBe("2026-11-07T12:00:00.000Z INFO  [api] request status=200 path=/x");
	});

	test("filters below the minimum level and merges child fields", () => {
		const { lines, sink } = capture();
		const logger = createLogger({ service: "api", level: "WARN", format: "json", sink, now });
		logger.info("hidden");
		logger.child({ module: "rag" }).warn("shown", { id: 1 });
		expect(lines).toHaveLength(1);
		expect(JSON.parse(lines[0]?.line ?? "{}")).toMatchObject({ module: "rag", id: 1 });
	});

	test("adds the active trace and span ids", async () => {
		const tracing = startTracing({ serviceName: "test" });
		const { lines, sink } = capture();
		const logger = createLogger({ service: "api", format: "json", sink, now });
		await withSpan("work", {}, async (span) => {
			logger.info("inside");
			const record = JSON.parse(lines[0]?.line ?? "{}");
			expect(record.traceId).toBe(span.spanContext().traceId);
			expect(record.spanId).toBe(span.spanContext().spanId);
		});
		await tracing.shutdown();
	});
});
