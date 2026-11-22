"use client";

import { ChartColumnIcon, PieChartIcon, Table01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import Link from "next/link";
import { useState } from "react";

import { BarRows } from "@/components/shared/bar-rows";
import { PageHeader } from "@/components/shared/page-header";

import { DailyChart } from "../components/daily-chart";
import { ModelsTable } from "../components/models-table";
import { RangePicker } from "../components/range-picker";
import { UsageTiles } from "../components/usage-tiles";
import { DEFAULT_RANGE } from "../constants/usage.constants";
import { useUsageQuery } from "../hooks/queries/use-usage-query";
import type { Usage } from "../types/usage.types";
import { formatCount } from "../utils/format";

/** Answers, tokens and cost over a window, from the provenance every answer records. */
export function UsageContainer() {
	const [days, setDays] = useState<number>(DEFAULT_RANGE);
	const usage = useUsageQuery(days);
	const data = usage.data;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Usage" actions={<RangePicker days={days} onChange={setDays} />}>
				{data?.scope === "you"
					? "Your answers only; admins and owners see the whole organization's."
					: "Every answer in this organization, by day and by the models behind it. Days are UTC."}
			</PageHeader>

			{usage.isPending ? (
				<p role="status" className="text-xs text-muted-foreground">
					Loading usage…
				</p>
			) : usage.isError ? (
				<Alert variant="destructive">
					<AlertTitle>Usage could not be loaded</AlertTitle>
					<AlertDescription className="flex flex-wrap items-center gap-2">
						{usage.error.message}
						<Button size="sm" variant="outline" onClick={() => usage.refetch()}>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : (
				<div
					className={`flex flex-col gap-6 ${usage.isFetching ? "opacity-60" : ""}`}
					aria-busy={usage.isFetching}
				>
					<UsageTiles totals={usage.data.totals} days={days} />
					{usage.data.totals.answers === 0 ? (
						<p className="text-sm text-muted-foreground">
							No answers in the last {days} days. Ask something in the{" "}
							<Link
								href="/playground"
								className="underline underline-offset-2 hover:text-foreground"
							>
								Playground
							</Link>{" "}
							and it shows up here.
						</p>
					) : (
						<>
							<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
								<Card>
									<CardHeader>
										<CardTitle>
											<HugeiconsIcon icon={ChartColumnIcon} strokeWidth={1.75} aria-hidden="true" />
											Answers per day
										</CardTitle>
									</CardHeader>
									<CardContent>
										<DailyChart days={usage.data.daily} />
									</CardContent>
								</Card>
								<Card>
									<CardHeader>
										<CardTitle>
											<HugeiconsIcon icon={PieChartIcon} strokeWidth={1.75} aria-hidden="true" />
											Answers by source
										</CardTitle>
										<CardDescription>Chat replies and Playground answers.</CardDescription>
									</CardHeader>
									<CardContent className="flex flex-col gap-6">
										<p className="flex items-baseline gap-2">
											<span className="font-mono text-[1.75rem] leading-none font-medium tabular-nums">
												{formatCount(usage.data.totals.answers)}
											</span>
											<span className="font-mono text-xs text-muted-foreground">
												in {days} days
											</span>
										</p>
										<BarRows label="Answers by source" rows={bySource(usage.data.models)} />
									</CardContent>
								</Card>
							</div>
							<Card>
								<CardHeader>
									<CardTitle>
										<HugeiconsIcon icon={Table01Icon} strokeWidth={1.75} aria-hidden="true" />
										By source, model and prompt
									</CardTitle>
									<CardDescription>
										Playground answers and chat replies. Cost is estimated from the prices in
										AI_MODEL_PRICES; models without one show “No price”.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<ModelsTable models={usage.data.models} />
								</CardContent>
							</Card>
						</>
					)}
				</div>
			)}
		</div>
	);
}

const SOURCE_LABEL = { chat: "Chat", rag: "Playground" } as const;

/** Answers per source, chat first; both rows always shown so the two stay comparable. */
function bySource(models: Usage["models"]) {
	return (["chat", "rag"] as const).map((source) => {
		const answers = models
			.filter((model) => model.source === source)
			.reduce((sum, model) => sum + model.answers, 0);
		return { label: SOURCE_LABEL[source], value: answers, display: formatCount(answers) };
	});
}
