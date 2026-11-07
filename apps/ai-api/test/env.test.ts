import { describe, expect, test } from "bun:test";

import { developmentJwtSecret, parseCorsOrigins, parseEnv } from "@/config/env";

describe("env", () => {
	test("applies development defaults", () => {
		const env = parseEnv({});
		expect(env.PORT).toBe(8000);
		expect(env.JWT_SECRET).toBe(developmentJwtSecret);
		expect(env.AI_BASE_URL).toBe("https://openrouter.ai/api/v1");
		expect(env.RUN_MIGRATIONS).toBe(false);
	});

	test("coerces numbers and booleans", () => {
		const env = parseEnv({ PORT: "9001", RAG_TOP_K: "8", RUN_MIGRATIONS: "true" });
		expect(env.PORT).toBe(9001);
		expect(env.RAG_TOP_K).toBe(8);
		expect(env.RUN_MIGRATIONS).toBe(true);
	});

	test("rejects the development secret and a missing AI key in production", () => {
		expect(() => parseEnv({ NODE_ENV: "production" })).toThrow(
			/JWT_SECRET must be changed.*AI_API_KEY is required/,
		);
	});

	test("accepts a complete production config", () => {
		const env = parseEnv({
			NODE_ENV: "production",
			JWT_SECRET: "x".repeat(40),
			AI_API_KEY: "test-key-not-real",
		});
		expect(env.NODE_ENV).toBe("production");
	});

	test("rejects overlap >= chunk size and short secrets", () => {
		expect(() => parseEnv({ RAG_CHUNK_SIZE: "300", RAG_CHUNK_OVERLAP: "300" })).toThrow(
			/RAG_CHUNK_OVERLAP/,
		);
		expect(() => parseEnv({ JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
	});

	test("treats empty strings as unset", () => {
		const env = parseEnv({ AI_EMBEDDING_BASE_URL: "", AI_API_KEY: "", PORT: "" });
		expect(env.AI_EMBEDDING_BASE_URL).toBeUndefined();
		expect(env.AI_API_KEY).toBeUndefined();
		expect(env.PORT).toBe(8000);
	});

	test("splits CORS origins", () => {
		expect(parseCorsOrigins(" http://a.test, ,http://b.test ")).toEqual([
			"http://a.test",
			"http://b.test",
		]);
	});
});
