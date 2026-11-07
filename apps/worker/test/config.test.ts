import { describe, expect, test } from "bun:test";

import { loadConfiguration } from "@/config";

describe("worker config", () => {
	test("applies defaults and falls back to AI_API_KEY for embeddings", () => {
		const config = loadConfiguration({ AI_API_KEY: "key-not-real" });
		expect(config.serviceName).toBe("synapse-worker");
		expect(config.reembedBatchSize).toBe(100);
		expect(config.ai.embedding.apiKey).toBe("key-not-real");
	});

	test("requires an embedding key in production", () => {
		expect(() => loadConfiguration({ NODE_ENV: "production" })).toThrow(/AI_API_KEY/);
	});
});
