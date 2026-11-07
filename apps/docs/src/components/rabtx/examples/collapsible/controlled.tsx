"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@rabtx/ui/collapsible";
import { useState } from "react";

const REPOS = ["rabtx/ui", "rabtx/docs", "rabtx/web"];

/** Controlled: the label follows the state. Everything after the trigger is what folds. */
export default function CollapsibleControlled() {
	const [open, setOpen] = useState(false);
	return (
		<div className="grid w-full max-w-sm gap-2">
			<Collapsible open={open} onOpenChange={setOpen}>
				<CollapsibleTrigger>
					Starred repositories
					<span className="ms-auto text-xs font-normal text-muted-foreground">
						{open ? "Hide" : `Show ${REPOS.length}`}
					</span>
				</CollapsibleTrigger>
				<CollapsibleContent className="grid gap-2 pt-2">
					{REPOS.map((repo) => (
						<div key={repo} className="rounded-lg border border-border px-3 py-2 font-mono text-sm">
							{repo}
						</div>
					))}
				</CollapsibleContent>
			</Collapsible>
			<p className="text-sm text-muted-foreground">{open ? "Open" : "Closed"}</p>
		</div>
	);
}
