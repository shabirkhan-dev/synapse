import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { type Account, call, signUp } from "../support/client";
import { SYSTEM } from "../support/env";
import { startStack } from "../support/stack";

/**
 * Load run against the API from source, Postgres and the fake model (the model answers at once,
 * so this measures our own overhead, not a vendor's latency). `bun run test:load`; tune with
 * LOAD_CONCURRENCY, LOAD_DURATION_SECONDS. Exits 1 when a threshold below is broken.
 */
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY ?? 20);
const DURATION_MS = Number(process.env.LOAD_DURATION_SECONDS ?? 30) * 1000;
const ACCOUNTS = 5;
const DOCUMENTS_PER_ACCOUNT = 3;
const MAX_ERROR_RATE = 0.01;

type Scenario = {
	name: string;
	weight: number;
	p95Ms: number;
	run(account: Account): Promise<number>;
};

async function streamChat(account: Account): Promise<number> {
	const response = await fetch(`${SYSTEM.apiUrl}/chat`, {
		method: "POST",
		headers: { "content-type": "application/json", authorization: `Bearer ${account.accessToken}` },
		body: JSON.stringify({
			messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "refund window?" }] }],
		}),
	});
	const text = await response.text();
	return text.includes('"type":"error"') ? 500 : response.status;
}

const SCENARIOS: Scenario[] = [
	{
		name: "list documents",
		weight: 3,
		p95Ms: 250,
		run: async (account) => (await call("/rag/documents", { token: account.accessToken })).status,
	},
	{
		name: "hybrid search",
		weight: 3,
		p95Ms: 500,
		run: async (account) =>
			(
				await call("/rag/query", {
					method: "POST",
					token: account.accessToken,
					body: { query: "how long do refunds take", answer: false },
				})
			).status,
	},
	{
		name: "answer with citations",
		weight: 3,
		p95Ms: 1_000,
		run: async (account) =>
			(
				await call("/rag/query", {
					method: "POST",
					token: account.accessToken,
					body: { query: "how long do refunds take" },
				})
			).status,
	},
	// The fake model streams 4 chunks 150 ms apart, so ~600 ms of every chat is the model.
	{ name: "streaming chat", weight: 1, p95Ms: 2_000, run: streamChat },
];

function pick(): Scenario {
	const total = SCENARIOS.reduce((sum, scenario) => sum + scenario.weight, 0);
	let roll = Math.random() * total;
	for (const scenario of SCENARIOS) {
		roll -= scenario.weight;
		if (roll <= 0) return scenario;
	}
	return SCENARIOS[0] as Scenario;
}

const percentile = (sorted: number[], p: number) =>
	sorted.length ? (sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0) : 0;

const stack = await startStack();
try {
	const accounts = await Promise.all(
		Array.from({ length: ACCOUNTS }, (_, index) => signUp(`load-${index}`)),
	);
	await Promise.all(
		accounts.flatMap((account) =>
			Array.from({ length: DOCUMENTS_PER_ACCOUNT }, (_, index) =>
				call("/rag/documents", {
					method: "POST",
					token: account.accessToken,
					body: {
						title: `Policy ${index}`,
						content: `Refunds are accepted within ${30 + index} days of purchase. `.repeat(40),
					},
				}),
			),
		),
	);

	const samples = new Map<string, { ms: number[]; errors: number }>(
		SCENARIOS.map((scenario) => [scenario.name, { ms: [], errors: 0 }]),
	);
	const deadline = performance.now() + DURATION_MS;
	const virtualUser = async (index: number) => {
		const account = accounts[index % accounts.length] as Account;
		while (performance.now() < deadline) {
			const scenario = pick();
			const started = performance.now();
			// oxlint-disable-next-line no-await-in-loop -- each virtual user runs one request at a time
			const status = await scenario.run(account).catch(() => 0);
			const sample = samples.get(scenario.name);
			if (!sample) continue;
			sample.ms.push(performance.now() - started);
			if (status < 200 || status >= 400) sample.errors++;
		}
	};
	console.log(`load: ${CONCURRENCY} virtual users for ${DURATION_MS / 1000} s`);
	await Promise.all(Array.from({ length: CONCURRENCY }, (_, index) => virtualUser(index)));

	const report = SCENARIOS.map((scenario) => {
		const { ms, errors } = samples.get(scenario.name) ?? { ms: [], errors: 0 };
		const sorted = ms.toSorted((a, b) => a - b);
		return {
			scenario: scenario.name,
			requests: ms.length,
			perSecond: Math.round((ms.length / DURATION_MS) * 1000 * 10) / 10,
			errors,
			p50Ms: Math.round(percentile(sorted, 0.5)),
			p95Ms: Math.round(percentile(sorted, 0.95)),
			p99Ms: Math.round(percentile(sorted, 0.99)),
			p95LimitMs: scenario.p95Ms,
		};
	});
	console.table(report);
	writeFileSync(join(SYSTEM.output, "load.json"), JSON.stringify(report, null, "\t"));

	const total = report.reduce((sum, row) => sum + row.requests, 0);
	const errors = report.reduce((sum, row) => sum + row.errors, 0);
	const broken = [
		...report
			.filter((row) => row.p95Ms > row.p95LimitMs)
			.map((row) => `${row.scenario}: p95 ${row.p95Ms} ms > ${row.p95LimitMs} ms`),
		...(errors / Math.max(total, 1) > MAX_ERROR_RATE
			? [`error rate ${((errors / total) * 100).toFixed(2)}% > ${MAX_ERROR_RATE * 100}%`]
			: []),
	];
	console.log(`load: ${total} requests, ${errors} errors`);
	if (broken.length) {
		console.error(`load: thresholds broken\n- ${broken.join("\n- ")}`);
		process.exitCode = 1;
	} else {
		console.log("load: all thresholds met");
	}
} finally {
	await stack.stop();
}
