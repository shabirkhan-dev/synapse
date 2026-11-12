"use client";

import { Card, CardContent } from "@synapse/ui/components/card";

import { CompareForm } from "../components/compare-form";
import { ModeResults } from "../components/mode-results";
import { useCompareRetrievalMutation } from "../hooks/mutations/use-compare-retrieval-mutation";

/** One query through every search mode, to see what answers can draw on and why. */
export function RetrievalContainer() {
	const compare = useCompareRetrievalMutation();
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-lg font-semibold">Retrieval</h1>
				<p className="max-w-prose text-xs text-muted-foreground text-pretty">
					Run one search through each mode and see which passages it finds and in what order.
					Nothing is answered and nothing is stored.
				</p>
			</div>
			<Card>
				<CardContent>
					<CompareForm pending={compare.isPending} onCompare={(input) => compare.mutate(input)} />
				</CardContent>
			</Card>
			<p role="status" className="sr-only">
				{compare.isPending ? "Searching…" : compare.data ? "Results ready." : ""}
			</p>
			{compare.data ? <ModeResults results={compare.data} /> : null}
		</div>
	);
}
