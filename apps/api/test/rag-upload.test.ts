import { describe, expect, test } from "bun:test";

import { authHeaders, buildTestApp } from "./helpers";

const fixture = (name: string) => Bun.file(new URL(`./fixtures/${name}`, import.meta.url));

type Upload = {
	name: string;
	body: string | ArrayBuffer | Uint8Array;
	type?: string;
	title?: string;
};

async function upload(app: ReturnType<typeof buildTestApp>["app"], file: Upload | null) {
	const form = new FormData();
	if (file) form.append("file", new File([file.body], file.name, { type: file.type ?? "" }));
	if (file?.title) form.append("title", file.title);
	const { authorization } = await authHeaders();
	return app.request("/api/v1/rag/documents/upload", {
		method: "POST",
		headers: { authorization },
		body: form,
	});
}

type DocumentBody = {
	data: {
		id: string;
		title: string;
		source: string | null;
		metadata: Record<string, unknown>;
		chunkCount: number;
	};
	message: string;
	error?: { code: string };
};

async function chunkText(app: ReturnType<typeof buildTestApp>["app"], id: string) {
	const response = await app.request(`/api/v1/rag/documents/${id}`, {
		headers: await authHeaders(),
	});
	const body = (await response.json()) as { data: { chunks: { content: string }[] } };
	return body.data.chunks.map((chunk) => chunk.content).join("\n");
}

describe("POST /rag/documents/upload", () => {
	test("stores a Markdown file under its name, as written", async () => {
		const { app } = buildTestApp();
		const response = await upload(app, {
			name: "Refund policy.md",
			body: "# Refunds\n\nCustomers get their money back within **30 days**.",
			type: "text/markdown",
		});
		expect(response.status).toBe(201);
		const body = (await response.json()) as DocumentBody;
		expect(body.data).toMatchObject({
			title: "Refund policy",
			source: "Refund policy.md",
			metadata: { fileName: "Refund policy.md", mediaType: "text/markdown" },
		});
		expect(await chunkText(app, body.data.id)).toContain("**30 days**");
	});

	test("extracts every page of a PDF and records the page count", async () => {
		const { app } = buildTestApp();
		const response = await upload(app, {
			name: "refund-policy.pdf",
			body: await fixture("refund-policy.pdf").arrayBuffer(),
			title: "Policies",
		});
		expect(response.status).toBe(201);
		const body = (await response.json()) as DocumentBody;
		expect(body.data.title).toBe("Policies");
		expect(body.data.metadata).toEqual({
			fileName: "refund-policy.pdf",
			mediaType: "application/pdf",
			pages: 2,
		});
		const text = await chunkText(app, body.data.id);
		expect(text).toContain("within 30 days of purchase");
		expect(text).toContain("five working days");
	});

	test("the same text twice returns the existing document", async () => {
		const { app } = buildTestApp();
		const file = { name: "notes.txt", body: "Refunds within 30 days." };
		expect((await upload(app, file)).status).toBe(201);
		const again = await upload(app, { ...file, name: "copy of notes.txt" });
		expect(again.status).toBe(200);
		expect(((await again.json()) as DocumentBody).message).toBe("Document already ingested");
	});

	test("refuses other file types and content that does not match the name", async () => {
		const { app } = buildTestApp();
		for (const file of [
			{ name: "report.docx", body: "PK\u0003\u0004 not text" },
			{ name: "image.png.txt", body: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x1a]) },
			{ name: "policy.txt", body: await fixture("refund-policy.pdf").arrayBuffer() },
		]) {
			// oxlint-disable-next-line no-await-in-loop -- one file at a time keeps failures readable
			const response = await upload(app, file);
			expect({ name: file.name, status: response.status }).toEqual({
				name: file.name,
				status: 415,
			});
			// oxlint-disable-next-line no-await-in-loop -- as above
			expect(((await response.json()) as DocumentBody).error?.code).toBe("RAG_UNSUPPORTED_FILE");
		}
	});

	test("explains a PDF without text and a damaged PDF", async () => {
		const { app } = buildTestApp();
		const scanned = await upload(app, {
			name: "scan.pdf",
			body: await fixture("scanned.pdf").arrayBuffer(),
		});
		expect(scanned.status).toBe(422);
		expect(((await scanned.json()) as DocumentBody).error?.code).toBe("RAG_FILE_HAS_NO_TEXT");

		const damaged = await upload(app, { name: "damaged.pdf", body: "%PDF-1.7 truncated" });
		expect(damaged.status).toBe(422);
		expect(((await damaged.json()) as DocumentBody).error?.code).toBe("RAG_FILE_UNREADABLE");
	});

	test("needs a file, a small one, and a signed-in user", async () => {
		const { app } = buildTestApp();
		const missing = await upload(app, null);
		expect(missing.status).toBe(422);
		expect(((await missing.json()) as DocumentBody).error?.code).toBe("VALIDATION_ERROR");

		const huge = await upload(app, { name: "big.txt", body: "x".repeat(2 * 1024 * 1024 + 1) });
		expect(huge.status).toBe(413);
		// The app-wide 2 MiB request cap (shared/middleware/body-limit.ts).
		expect(((await huge.json()) as DocumentBody).error?.code).toBe("PAYLOAD_TOO_LARGE");

		const anonymous = await app.request("/api/v1/rag/documents/upload", {
			method: "POST",
			body: new FormData(),
		});
		expect(anonymous.status).toBe(401);
	});
});
