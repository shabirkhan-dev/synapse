"use client";

import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import { Card, CardContent } from "@synapse/ui/components/card";

import { useCurrentUserQuery } from "@/features/auth";
import { ApiError } from "@/lib/api/api-error";
import { can } from "@/lib/permissions";

import { ApprovalsList } from "../components/approvals-list";
import { OVERSIGHT_FORBIDDEN } from "../constants/oversight.constants";
import { useApproveRequestMutation } from "../hooks/mutations/use-approve-request-mutation";
import { useRejectRequestMutation } from "../hooks/mutations/use-reject-request-mutation";
import { usePendingApprovalsQuery } from "../hooks/queries/use-pending-approvals-query";
import type { DecisionResult } from "../types/approval.types";

/** What a decision did, in words ("3 documents deleted", "Rejected"). */
function describe(result: DecisionResult): string {
	if (result.outcome.status === "rejected") return "Rejected. The action did not run.";
	const deleted = (result.outcome.result as { deleted?: unknown } | undefined)?.deleted;
	return typeof deleted === "number"
		? `Approved. ${deleted} ${deleted === 1 ? "document" : "documents"} deleted.`
		: "Approved. The action ran.";
}

/** Requests waiting for a decision. Admins and owners decide; members see their own requests. */
export function ApprovalsContainer() {
	const approvals = usePendingApprovalsQuery();
	const me = useCurrentUserQuery();
	const approve = useApproveRequestMutation();
	const reject = useRejectRequestMutation();
	const busyId = approve.isPending
		? (approve.variables ?? null)
		: reject.isPending
			? (reject.variables?.id ?? null)
			: null;
	const decision = approve.data ?? reject.data;
	const failure = approve.error ?? reject.error;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-lg font-semibold">Approvals</h1>
				<p className="text-xs text-muted-foreground">
					Risky actions wait here until an admin or owner approves them.
				</p>
			</div>
			{decision && !approve.isPending && !reject.isPending ? (
				<Alert role="status">
					<AlertDescription>{describe(decision)}</AlertDescription>
				</Alert>
			) : null}
			{failure ? (
				<Alert variant="destructive">
					<AlertTitle>
						{failure instanceof ApiError && failure.code === OVERSIGHT_FORBIDDEN
							? "Only admins and owners decide"
							: "The decision did not go through"}
					</AlertTitle>
					<AlertDescription>{failure.message}</AlertDescription>
				</Alert>
			) : null}
			<Card>
				<CardContent>
					{approvals.isPending ? (
						<p role="status" className="text-xs text-muted-foreground">
							Loading requests…
						</p>
					) : approvals.isError ? (
						<Alert variant="destructive">
							<AlertTitle>Requests could not be loaded</AlertTitle>
							<AlertDescription className="flex items-center gap-3">
								{approvals.error.message}
								<Button size="sm" variant="outline" onClick={() => approvals.refetch()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : approvals.data.length === 0 ? (
						<p className="text-xs text-muted-foreground">Nothing is waiting for a decision.</p>
					) : (
						<ApprovalsList
							approvals={approvals.data}
							currentUserId={me.data?.id ?? null}
							canDecide={me.data ? can(me.data.organization.role, "approvals.decide") : false}
							busyId={busyId}
							onApprove={(id) => {
								reject.reset();
								approve.mutate(id);
							}}
							onReject={(id, reason) => {
								approve.reset();
								reject.mutate({ id, reason });
							}}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
