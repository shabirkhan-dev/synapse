"use client";

import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import { Card, CardContent } from "@synapse/ui/components/card";

import { useCurrentUserQuery } from "@/features/auth";

import { ActivityTable } from "../components/activity-table";
import { ACTIVITY_LIMIT } from "../constants/activity.constants";
import { useActivityQuery } from "../hooks/queries/use-activity-query";

/** The recent audit trail: who did what, newest first. */
export function ActivityContainer() {
	const activity = useActivityQuery(ACTIVITY_LIMIT);
	const me = useCurrentUserQuery();

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-lg font-semibold">Activity</h1>
				<p className="text-xs text-muted-foreground">
					The last {ACTIVITY_LIMIT} recorded events. Every answer, change and decision is kept;
					personal data is redacted.
				</p>
			</div>
			<Card>
				<CardContent>
					{activity.isPending ? (
						<p role="status" className="text-xs text-muted-foreground">
							Loading activity…
						</p>
					) : activity.isError ? (
						<Alert variant="destructive">
							<AlertTitle>Activity could not be loaded</AlertTitle>
							<AlertDescription className="flex items-center gap-3">
								{activity.error.message}
								<Button size="sm" variant="outline" onClick={() => activity.refetch()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : activity.data.length === 0 ? (
						<p className="text-xs text-muted-foreground">Nothing recorded yet.</p>
					) : (
						<ActivityTable events={activity.data} currentUserId={me.data?.id ?? null} />
					)}
				</CardContent>
			</Card>
		</div>
	);
}
