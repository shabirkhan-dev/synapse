"use client";

import { Badge } from "@synapse/ui/components/badge";
import { Button } from "@synapse/ui/components/button";
import { Input } from "@synapse/ui/components/input";
import { type FormEvent, useState } from "react";

import { validateForm } from "@/lib/forms/validate-form";

import { ACTION_LABELS } from "../constants/oversight.constants";
import { rejectFormSchema } from "../schemas/approval.schema";
import type { Approval } from "../types/approval.types";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export type ApprovalsListProps = {
	approvals: Approval[];
	/** To say "you" for the signed-in user's own requests. */
	currentUserId: string | null;
	/** The request being decided right now (its buttons are disabled). */
	busyId: string | null;
	onApprove: (id: string) => void;
	onReject: (id: string, reason: string | undefined) => void;
};

/** Pending requests, newest first, each with approve / reject (and an optional reason). */
export function ApprovalsList({
	approvals,
	currentUserId,
	busyId,
	onApprove,
	onReject,
}: ApprovalsListProps) {
	return (
		<ul className="flex flex-col gap-3">
			{approvals.map((approval) => (
				<ApprovalItem
					key={approval.id}
					approval={approval}
					mine={approval.requestedBy !== null && approval.requestedBy === currentUserId}
					busy={busyId === approval.id}
					onApprove={() => onApprove(approval.id)}
					onReject={(reason) => onReject(approval.id, reason)}
				/>
			))}
		</ul>
	);
}

function ApprovalItem({
	approval,
	mine,
	busy,
	onApprove,
	onReject,
}: {
	approval: Approval;
	mine: boolean;
	busy: boolean;
	onApprove: () => void;
	onReject: (reason: string | undefined) => void;
}) {
	const [error, setError] = useState<string | null>(null);
	const reasonId = `reason-${approval.id}`;

	function handleReject(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const result = validateForm(rejectFormSchema, event.currentTarget, ["reason"]);
		setError(result.success ? null : (result.errors.reason ?? null));
		if (result.success) onReject(result.data.reason);
	}

	return (
		<li className="flex flex-col gap-3 rounded-md border p-4">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant="outline">{ACTION_LABELS[approval.action] ?? approval.action}</Badge>
				<span className="text-xs text-muted-foreground">
					Requested by {mine ? "you" : "a member"} ·{" "}
					<time dateTime={approval.createdAt}>
						{dateFormat.format(new Date(approval.createdAt))}
					</time>
				</span>
			</div>
			<p className="text-sm">{approval.summary}</p>
			<form className="flex flex-wrap items-end gap-2" onSubmit={handleReject} noValidate>
				<Button type="button" disabled={busy} onClick={onApprove}>
					{busy ? "Working…" : "Approve"}
				</Button>
				<div className="flex min-w-48 flex-1 flex-col gap-1">
					<label htmlFor={reasonId} className="sr-only">
						Reason for rejecting
					</label>
					<Input
						id={reasonId}
						name="reason"
						placeholder="Reason (optional)"
						aria-invalid={error ? true : undefined}
					/>
				</div>
				<Button type="submit" variant="outline" disabled={busy}>
					Reject
				</Button>
			</form>
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
		</li>
	);
}
