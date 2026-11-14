import { describe, expect, test } from "bun:test";

import { PDF_ERROR_CODES, type PdfTextExtractor } from "@synapse/core/contracts";
import { SynapseError } from "@synapse/core/errors";

import { extractFileText } from "../src";

const encode = (text: string) => new TextEncoder().encode(text);
const pdfBytes = encode("%PDF-1.4\n…");

function fakePdf(pages: string[] | Error): PdfTextExtractor & { calls: number } {
	const extractor = {
		calls: 0,
		async extract() {
			extractor.calls++;
			if (pages instanceof Error) throw pages;
			return { pages };
		},
	};
	return extractor;
}

describe("extractFileText", () => {
	test("reads text and keeps Markdown as written", async () => {
		const pdf = fakePdf([]);
		expect(
			await extractFileText(
				{ name: "Refund policy.md", bytes: encode("# Refunds\n\n*30* days") },
				{ pdf },
			),
		).toEqual({
			status: "extracted",
			title: "Refund policy",
			content: "# Refunds\n\n*30* days",
			mediaType: "text/markdown",
			pages: null,
		});
		const text = await extractFileText({ name: "notes.TXT", bytes: encode("﻿hello") }, { pdf });
		expect(text).toMatchObject({ status: "extracted", content: "hello", mediaType: "text/plain" });
		expect(pdf.calls).toBe(0);
	});

	test("joins PDF pages and counts them", async () => {
		const result = await extractFileText(
			{ name: "handbook.pdf", bytes: pdfBytes },
			{ pdf: fakePdf(["Page one.", "Page two."]) },
		);
		expect(result).toEqual({
			status: "extracted",
			title: "handbook",
			content: "Page one.\n\nPage two.",
			mediaType: "application/pdf",
			pages: 2,
		});
	});

	test("refuses other types and content that does not match the name", async () => {
		const pdf = fakePdf(["never read"]);
		for (const file of [
			{ name: "report.docx", bytes: encode("PK\u0003\u0004") },
			{ name: "no-extension", bytes: encode("text") },
			{ name: "renamed.txt", bytes: pdfBytes },
			{ name: "fake.pdf", bytes: encode("just text") },
			{ name: "binary.txt", bytes: new Uint8Array([0x68, 0x00, 0x69]) },
			{ name: "latin1.txt", bytes: new Uint8Array([0x63, 0x61, 0x66, 0xe9]) },
		]) {
			// oxlint-disable-next-line no-await-in-loop -- one file at a time keeps failures readable
			expect({ name: file.name, ...(await extractFileText(file, { pdf })) }).toEqual({
				name: file.name,
				status: "unsupported",
			});
		}
		expect(pdf.calls).toBe(0);
	});

	test("an empty file or a PDF without a text layer has no text", async () => {
		expect(
			await extractFileText({ name: "empty.md", bytes: encode(" \n ") }, { pdf: fakePdf([]) }),
		).toEqual({ status: "no-text" });
		expect(
			await extractFileText({ name: "scan.pdf", bytes: pdfBytes }, { pdf: fakePdf(["", " "]) }),
		).toEqual({ status: "no-text" });
	});

	test("an unreadable PDF is reported; other extractor failures are rethrown", async () => {
		const unreadable = new SynapseError(PDF_ERROR_CODES.UNREADABLE, "bad");
		expect(
			await extractFileText({ name: "broken.pdf", bytes: pdfBytes }, { pdf: fakePdf(unreadable) }),
		).toEqual({ status: "unreadable" });
		const slow = new SynapseError(PDF_ERROR_CODES.TIMEOUT, "too slow");
		expect(
			await extractFileText({ name: "huge.pdf", bytes: pdfBytes }, { pdf: fakePdf(slow) }),
		).toEqual({ status: "timed-out" });
		const bug = new Error("out of memory");
		await expect(
			extractFileText({ name: "big.pdf", bytes: pdfBytes }, { pdf: fakePdf(bug) }),
		).rejects.toBe(bug);
	});
});
