"use client";

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

import { DailyChart } from "../components/daily-chart";
import { ModelsTable } from "../components/models-table";
import { RangePicker } from "../components/range-picker";
import { UsageTiles } from "../components/usage-tiles";
import { DEFAULT_RANGE } from "../constants/usage.constants";
import { useUsageQuery } from "../hooks/queries/use-usage-query";

/** Answers, tokens and cost over a window, from the provenance every answer records. */
export function UsageContainer() {
	const [days, setDays] = useState<number>(DEFAULT_RANGE);
	const usage = useUsageQuery(days);
	const data = usage.data;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-lg font-semibold">Usage</h1>
					<p className="text-xs text-muted-foreground">
						{data?.scope === "you"
							? "Your answers only; admins and owners see the whole organization's."
							: "Every answer in this organization, by day and by the models behind it. Days are UTC."}
					</p>
				</div>
				<RangePicker days={days} onChange={setDays} />
			</div>

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
					<UsageTiles totals={usage.data.totals} />
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
							<Card>
								<CardHeader>
									<CardTitle>Answers per day</CardTitle>
								</CardHeader>
								<CardContent>
									<DailyChart days={usage.data.daily} />
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle>By source, model and prompt</CardTitle>
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
