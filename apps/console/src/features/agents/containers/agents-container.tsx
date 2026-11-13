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

import { useCurrentUserQuery } from "@/features/auth";

import { AgentOverview } from "../components/agent-overview";
import { AgentRunsTable } from "../components/agent-runs-table";
import { useAgentRunsQuery } from "../hooks/queries/use-agent-runs-query";
import { useAgentsOverviewQuery } from "../hooks/queries/use-agents-overview-query";

/** What the assistants run on, and what they did lately. Read-only: settings live in the deployment. */
export function AgentsContainer() {
	const overview = useAgentsOverviewQuery();
	const runs = useAgentRunsQuery();
	const me = useCurrentUserQuery();

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-lg font-semibold">Agents</h1>
				<p className="text-xs text-muted-foreground">
					The assistants behind Chat and the Playground: their models, prompts, tools and limits,
					and what they did recently. Settings come from the deployment's configuration.
				</p>
			</div>

			{overview.isPending ? (
				<p role="status" className="text-xs text-muted-foreground">
					Loading agents…
				</p>
			) : overview.isError ? (
				<Alert variant="destructive">
					<AlertTitle>Agents could not be loaded</AlertTitle>
					<AlertDescription className="flex flex-wrap items-center gap-2">
						{overview.error.message}
						<Button size="sm" variant="outline" onClick={() => overview.refetch()}>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : (
				<AgentOverview overview={overview.data} />
			)}

			<Card>
				<CardHeader>
					<CardTitle>Recent runs</CardTitle>
					<CardDescription>
						The latest 25 answers. Admins and owners see everyone's; members see their own.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{runs.isPending ? (
						<p role="status" className="text-xs text-muted-foreground">
							Loading runs…
						</p>
					) : runs.isError ? (
						<Alert variant="destructive">
							<AlertDescription className="flex flex-wrap items-center gap-2">
								{runs.error.message}
								<Button size="sm" variant="outline" onClick={() => runs.refetch()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : runs.data.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							No runs yet. Ask something in{" "}
							<Link href="/chat" className="underline underline-offset-2 hover:text-foreground">
								Chat
							</Link>{" "}
							or the{" "}
							<Link
								href="/playground"
								className="underline underline-offset-2 hover:text-foreground"
							>
								Playground
							</Link>
							.
						</p>
					) : (
						<AgentRunsTable runs={runs.data} currentUserId={me.data?.id ?? null} />
					)}
				</CardContent>
			</Card>
		</div>
	);
}
