import { describe, expect, test } from "bun:test";

import { createCircuitStatus } from "@/infrastructure/reliability/circuit-status";
import { SystemService } from "@/modules/system";

import { authHeaders, buildTestApp, InMemorySystemRepository, testConfig } from "./helpers";

const versions = { embeddingModel: "mock:embed", chunkerVersion: "text-v1" };
const owner = { sub: "u1", sid: "s", orgId: "org-1", role: "owner" as const };

describe("system status", () => {
	test("owners see the database, circuits, jobs, index and traces", async () => {
		const { app, systemRepository, rag } = buildTestApp();
		const current = rag.versions.embeddingModel;
		systemRepository.jobs = [{ queue: "knowledge.reembed-chunks", state: "completed", count: 3 }];
		systemRepository.chunks.set("user-1", [
			{ embeddingModel: current, chunks: 10 },
			{ embeddingModel: "old:embed", chunks: 2 },
		]);
		const response = await app.request("/api/v1/system/status", { headers: await authHeaders() });
		expect(response.status).toBe(200);
		const { data } = (await response.json()) as {
			data: {
				database: { ok: boolean; latencyMs: number };
				circuits: { name: string; state: string }[];
				jobs: { counts: unknown[] };
				index: { chunkModels: { embeddingModel: string; chunks: number; current: boolean }[] };
				traces: { destination: string };
			};
		};
		expect(data.database.ok).toBe(true);
		expect(data.circuits.map((circuit) => [circuit.name, circuit.state])).toEqual([
			["chat", "closed"],
			["embeddings", "closed"],
		]);
		expect(data.jobs.counts).toHaveLength(1);
		expect(data.index.chunkModels).toEqual([
			{ embeddingModel: current, chunks: 10, current: true },
			{ embeddingModel: "old:embed", chunks: 2, current: false },
		]);
		expect(data.traces.destination).toBe("none");
	});

	test("members are refused", async () => {
		const system = new SystemService({
			repository: new InMemorySystemRepository(),
			circuits: createCircuitStatus([]),
			config: testConfig,
			rag: { versions },
		});
		await expect(system.status({ ...owner, role: "member" })).rejects.toMatchObject({
			statusCode: 403,
		});
	});

	test("an open circuit and an unreachable database are reported, not thrown", async () => {
		const repository = new InMemorySystemRepository();
		repository.reachable = false;
		const circuits = createCircuitStatus(["chat"], () => new Date("2026-11-13T10:00:00Z"));
		circuits.record("chat", "open");
		const system = new SystemService({
			repository,
			circuits,
			config: testConfig,
			rag: { versions },
		});
		const status = await system.status(owner);
		expect(status.database).toEqual({ ok: false, latencyMs: null });
		expect(status.jobs.counts).toBeNull();
		expect(status.circuits).toEqual([
			{
				name: "chat",
				state: "open",
				since: "2026-11-13T10:00:00.000Z",
				resetAfterMs: testConfig.reliability.breaker.resetAfterMs,
			},
		]);
	});

	test("trace export shows the host only, never the keys", async () => {
		const system = new SystemService({
			repository: new InMemorySystemRepository(),
			circuits: createCircuitStatus([]),
			config: {
				...testConfig,
				observability: {
					...testConfig.observability,
					traceExport: {
						destination: "langfuse",
						endpoint: "https://cloud.langfuse.com/api/public/otel",
						headers: { Authorization: "Basic c2VjcmV0" },
					},
				},
			},
			rag: { versions },
		});
		const status = await system.status(owner);
		expect(status.traces).toEqual({ destination: "langfuse", host: "cloud.langfuse.com" });
		expect(JSON.stringify(status)).not.toContain("c2VjcmV0");
	});
});
