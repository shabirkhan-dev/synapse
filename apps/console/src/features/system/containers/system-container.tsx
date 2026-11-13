"use client";

import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";

import { ApiError } from "@/lib/api/api-error";

import { SystemStatusView } from "../components/system-status-view";
import { useSystemStatusQuery } from "../hooks/queries/use-system-status-query";

/** How the API and what it depends on are doing, for admins and owners. */
export function SystemContainer() {
	const status = useSystemStatusQuery();
	const forbidden = status.error instanceof ApiError && status.error.status === 403;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-lg font-semibold">System</h1>
				<p className="text-xs text-muted-foreground">
					The database, model and email providers, background jobs, the index and tracing. Refreshes
					every 30 seconds.
				</p>
			</div>
			{status.isPending ? (
				<p role="status" className="text-xs text-muted-foreground">
					Checking…
				</p>
			) : forbidden ? (
				<p className="text-sm text-muted-foreground">
					Only admins and owners can see the system status. Ask one of them if something seems
					wrong.
				</p>
			) : status.isError ? (
				<Alert variant="destructive">
					<AlertTitle>The status could not be loaded</AlertTitle>
					<AlertDescription className="flex flex-wrap items-center gap-2">
						{status.error.message}
						<Button size="sm" variant="outline" onClick={() => status.refetch()}>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : (
				<SystemStatusView status={status.data} />
			)}
		</div>
	);
}
