import { describe, expect, test } from "bun:test";

import { RAG_MESSAGES } from "@/modules/rag/constants/rag.constants";

describe("purge summary", () => {
	test("reads naturally for one, several and more than counted", () => {
		expect(RAG_MESSAGES.PURGE_SUMMARY(1, 1000)).toBe("Delete your only document and its chunks");
		expect(RAG_MESSAGES.PURGE_SUMMARY(3, 1000)).toBe(
			"Delete all 3 of your documents and their chunks",
		);
		expect(RAG_MESSAGES.PURGE_SUMMARY(1001, 1000)).toBe(
			"Delete all 1000+ of your documents and their chunks",
		);
	});
});
