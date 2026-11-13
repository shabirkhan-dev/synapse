import { describe, expect, test } from "bun:test";

import { PDF_ERROR_CODES } from "@synapse/core/contracts";

import { createPdfTextExtractor } from "../src/pdf";
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
