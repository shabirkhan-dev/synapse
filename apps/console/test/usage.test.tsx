import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { UsageContainer } from "@/features/usage";
import { DailyChart } from "@/features/usage/components/daily-chart";
import { ModelsTable } from "@/features/usage/components/models-table";
import { UsageTiles } from "@/features/usage/components/usage-tiles";
import { setAccessToken } from "@/lib/api/session";

import { mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

afterEach(() => {
	cleanup();
	setAccessToken(null);
});

const day = (date: string, answers: number) => ({
	day: date,
	answers,
	inputTokens: answers * 10,
	outputTokens: answers * 5,
});
const usage = (days: number, answers: number, scope: "organization" | "you" = "organization") => ({
	scope,
	days,
	since: "2026-11-10T00:00:00.000Z",
	totals: {
		answers,
		inputTokens: answers * 10,
		outputTokens: answers * 5,
		costUsd: null,
		unpricedAnswers: answers,
	},
	daily: [day("2026-11-10", 0), day("2026-11-11", 1), day("2026-11-12", answers - 1)],
	models:
		answers === 0
			? []
			: [
					{
						chatModel: "openai:gpt-4o-mini",
						promptVersion: "rag-answer@2",
						embeddingModel: "openai:text-embedding-3-small",
						answers,
						inputTokens: answers * 10,
						outputTokens: answers * 5,
						costUsd: null,
					},
				],
});

describe("UsageTiles", () => {
	test("says why there is no cost, or how many answers were left out of it", () => {
		const { rerender } = render(
			<UsageTiles
				totals={{
					answers: 3,
					inputTokens: 12_400,
					outputTokens: 50,
					costUsd: null,
					unpricedAnswers: 3,
				}}
			/>,
		);
		expect(screen.getByText("No prices set (AI_MODEL_PRICES)")).toBeDefined();
		expect(screen.getByText("12.4K")).toBeDefined();
		expect(screen.getByText("12,400")).toBeDefined();
		rerender(
			<UsageTiles
				totals={{
					answers: 3,
					inputTokens: 10,
					outputTokens: 5,
					costUsd: 0.0123,
					unpricedAnswers: 1,
				}}
			/>,
		);
		expect(screen.getByText("$0.0123")).toBeDefined();
		expect(screen.getByText("1 answer has no price")).toBeDefined();
	});
});

describe("DailyChart", () => {
	test("names the busiest day, shows a day's numbers on hover, and has a table of the same data", () => {
		const { container } = render(
			<DailyChart days={[day("2026-11-10", 0), day("2026-11-11", 3), day("2026-11-12", 1)]} />,
		);
		expect(screen.getByText("Busiest: Nov 11 with 3 answers.")).toBeDefined();
		const slots = container.querySelectorAll(".h-40 > div");
		expect(slots).toHaveLength(3);
		expect(slots[0]?.children).toHaveLength(0);
		fireEvent.pointerEnter(slots[1] as Element);
		expect(screen.getByText("3 answers")).toBeDefined();
		expect(screen.getByText("30 in · 15 out tokens")).toBeDefined();
		const table = screen.getByRole("table");
		expect(within(table).getAllByRole("row")).toHaveLength(4);
	});
});

describe("ModelsTable", () => {
	test("an unpriced model says so in words", () => {
		render(<ModelsTable models={usage(3, 2).models} />);
		expect(screen.getByText("openai:gpt-4o-mini")).toBeDefined();
		expect(screen.getByText("No price")).toBeDefined();
	});
});

describe("UsageContainer (mocked API)", () => {
	test("loads 30 days, switches range, and says whose answers these are", async () => {
		signedIn();
		const calls = mockFetch((call) => {
			const days = Number(new URL(call.url).searchParams.get("days"));
			return ok(usage(days, days === 7 ? 2 : 4, days === 7 ? "you" : "organization"));
		});
		renderWithQuery(<UsageContainer />);
		await screen.findByText("Answers per day");
		expect(screen.getByText(/Every answer in this organization/)).toBeDefined();
		expect(screen.getByRole("button", { name: "Last 30 days" }).getAttribute("aria-pressed")).toBe(
			"true",
		);

		fireEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
		await screen.findByText(/Your answers only/);
		expect(calls.map((call) => new URL(call.url).search)).toEqual(["?days=30", "?days=7"]);
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Last 7 days" }).getAttribute("aria-pressed")).toBe(
				"true",
			),
		);
	});

	test("no answers yet points to where answers come from", async () => {
		signedIn();
		mockFetch(() => ok(usage(30, 0)));
		renderWithQuery(<UsageContainer />);
		await screen.findByText(/No answers in the last 30 days/);
		expect(screen.getByRole("link", { name: "Playground" }).getAttribute("href")).toBe(
			"/playground",
		);
		expect(screen.queryByText("Answers per day")).toBeNull();
	});
});
