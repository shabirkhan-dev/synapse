import { describe, expect, test } from "bun:test";

import { PDF_ERROR_CODES } from "@synapse/core/contracts";

import { createPdfTextExtractor, createWorkerPdfTextExtractor } from "../src/pdf";
import { makePdf } from "./fixtures/make-pdf";

const pdf = createPdfTextExtractor();

describe("unpdf text extractor", () => {
	test("returns the text of each page", async () => {
		const bytes = makePdf([
			"Refunds are accepted within 30 days.",
			"Shipping (by post) takes a week.",
		]);
		expect(await pdf.extract(bytes)).toEqual({
			pages: ["Refunds are accepted within 30 days.", "Shipping (by post) takes a week."],
		});
		// The caller's buffer is not handed to pdf.js, so it can be read again.
		expect(await pdf.extract(bytes)).toMatchObject({ pages: { length: 2 } });
	});

	test("a page without a text layer is an empty string", async () => {
		expect(await pdf.extract(makePdf(["", "Second page"]))).toEqual({ pages: ["", "Second page"] });
	});

	test("a malformed file throws PDF_UNREADABLE", async () => {
		const garbage = new TextEncoder().encode("%PDF-1.4 this is not really a pdf");
		await expect(pdf.extract(garbage)).rejects.toMatchObject({ code: PDF_ERROR_CODES.UNREADABLE });
	});
});

const fixture = (name: string) => new URL(`./fixtures/${name}`, import.meta.url);

describe("worker PDF text extractor", () => {
	test("reads the pages in a worker thread", async () => {
		const reader = createWorkerPdfTextExtractor({
			workerUrl: fixture("pdf.worker.ts"),
			timeoutMs: 10_000,
		});
		expect(
			await reader.extract(makePdf(["Refunds within 30 days.", "Shipping takes a week."])),
		).toEqual({
			pages: ["Refunds within 30 days.", "Shipping takes a week."],
		});
		const garbage = new TextEncoder().encode("%PDF-1.4 not really a pdf");
		await expect(reader.extract(garbage)).rejects.toMatchObject({
			code: PDF_ERROR_CODES.UNREADABLE,
		});
	});

	test("a parse that never ends is stopped at the deadline", async () => {
		const reader = createWorkerPdfTextExtractor({
			workerUrl: fixture("hanging.worker.ts"),
			timeoutMs: 300,
		});
		const started = performance.now();
		await expect(reader.extract(makePdf(["x"]))).rejects.toMatchObject({
			code: PDF_ERROR_CODES.TIMEOUT,
		});
		expect(performance.now() - started).toBeLessThan(2_000);
	});

	test("a crashed reader is an unreadable file", async () => {
		const reader = createWorkerPdfTextExtractor({
			workerUrl: fixture("crashing.worker.ts"),
			timeoutMs: 5_000,
		});
		await expect(reader.extract(makePdf(["x"]))).rejects.toMatchObject({
			code: PDF_ERROR_CODES.UNREADABLE,
		});
	});
});
