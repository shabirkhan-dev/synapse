import { describe, expect, test } from "bun:test";

import { contentHash, createIngestionPipeline, type IngestableDocument } from "../src";

const ZWSP = String.fromCodePoint(0x200b);

type Stored = { id: string; ownerId: string; contentHash: string; title: string };

function setup() {
	const stored: Stored[] = [];
	const indexed: IngestableDocument[] = [];
	const pipeline = createIngestionPipeline<Stored>({
		async findByContentHash(ownerId, hash) {
			return stored.find((d) => d.ownerId === ownerId && d.contentHash === hash) ?? null;
		},
		async index(document) {
			indexed.push(document);
			const row = { id: `doc-${stored.length + 1}`, ...document };
			stored.push(row);
			return row;
		},
	});
	return { pipeline, indexed };
}

describe("ingestion pipeline", () => {
	test("indexes a new document with its normalized content and hash", async () => {
		const { pipeline, indexed } = setup();
		const result = await pipeline.ingest("u1", { title: " Policy ", content: "Refunds\r\n" });
		expect(result).toMatchObject({ status: "created", document: { id: "doc-1" } });
		expect(indexed[0]).toMatchObject({
			ownerId: "u1",
			title: "Policy",
			content: "Refunds",
			contentHash: contentHash("Refunds"),
		});
	});

	test("returns the existing document for the same content, even with different whitespace", async () => {
		const { pipeline, indexed } = setup();
		await pipeline.ingest("u1", { title: "a", content: "Refunds within 30 days" });
		const again = await pipeline.ingest("u1", {
			title: "b",
			content: "Refunds within 30 days  \n",
		});
		expect(again).toMatchObject({ status: "duplicate", document: { id: "doc-1" } });
		expect(indexed).toHaveLength(1);
	});

	test("deduplicates per owner, not globally", async () => {
		const { pipeline } = setup();
		await pipeline.ingest("u1", { title: "a", content: "same" });
		expect((await pipeline.ingest("u2", { title: "a", content: "same" })).status).toBe("created");
	});

	test("reports empty content without indexing", async () => {
		const { pipeline, indexed } = setup();
		expect(await pipeline.ingest("u1", { title: "a", content: ` \n${ZWSP} ` })).toEqual({
			status: "empty",
		});
		expect(indexed).toHaveLength(0);
	});
});
