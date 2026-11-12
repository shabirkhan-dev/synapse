import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@synapse/ui/components/table";

import { ACTION_LABELS } from "../constants/activity.constants";
import type { AuditEvent } from "../types/activity.types";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

const text = (value: unknown) => (typeof value === "string" ? value : null);

/** One short, safe detail per event (already redacted by the API); shown as plain text. */
function detail(event: AuditEvent): string {
	const { data } = event;
	if (event.action === "oversight.approval.decided") {
		return data.approved === true ? "Approved" : "Rejected";
	}
	if (event.action === "rag.documents.purged" && typeof data.deleted === "number") {
		return `${data.deleted} deleted`;
	}
	return text(data.title) ?? text(data.question) ?? text(data.summary) ?? "";
}

export type ActivityTableProps = {
	events: AuditEvent[];
	/** To say "you" for the signed-in user's own actions. */
	currentUserId: string | null;
};

export function ActivityTable({ events, currentUserId }: ActivityTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>When</TableHead>
					<TableHead>Who</TableHead>
					<TableHead>What</TableHead>
					<TableHead>Detail</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{events.map((event) => (
					<TableRow key={event.id}>
						<TableCell className="whitespace-nowrap text-muted-foreground">
							<time dateTime={event.createdAt}>{dateFormat.format(new Date(event.createdAt))}</time>
						</TableCell>
						<TableCell>
							{event.actorId === currentUserId
								? "You"
								: event.actorId === "system"
									? "Synapse"
									: "A member"}
						</TableCell>
						<TableCell>{ACTION_LABELS[event.action] ?? event.action}</TableCell>
						<TableCell className="max-w-80 truncate text-muted-foreground">
							{detail(event)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
