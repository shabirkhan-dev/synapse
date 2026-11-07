import { describe, expect, test } from "bun:test";

import { isSynapseError, SynapseError } from "../src/errors";

describe("SynapseError", () => {
	test("carries code, message, details and cause", () => {
		const cause = new Error("root cause");
		const error = new SynapseError("RAG_DOCUMENT_NOT_FOUND", "Document not found", {
			details: [{ id: "doc_1" }],
			cause,
		});
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("SynapseError");
		expect(error.code).toBe("RAG_DOCUMENT_NOT_FOUND");
		expect(error.message).toBe("Document not found");
		expect(error.details).toEqual([{ id: "doc_1" }]);
		expect(error.cause).toBe(cause);
	});

	test("omits details and cause when not given", () => {
		const error = new SynapseError("CONFIG_INVALID", "bad");
		expect(error.details).toBeUndefined();
		expect(error.cause).toBeUndefined();
	});

	test("isSynapseError narrows only SynapseError", () => {
		expect(isSynapseError(new SynapseError("X_Y", "x"))).toBe(true);
		expect(isSynapseError(new Error("x"))).toBe(false);
		expect(isSynapseError("x")).toBe(false);
	});
});
