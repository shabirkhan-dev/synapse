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

function actor(event: AuditEvent, currentUserId: string | null): string {
	if (event.actorId === currentUserId) return "You";
	return event.actorId === "system" ? "Synapse" : "A member";
}

/** On phones When, Who and Detail fold under What, so the table needs no sideways scroll. */
export function ActivityTable({ events, currentUserId }: ActivityTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="hidden sm:table-cell">When</TableHead>
					<TableHead className="hidden sm:table-cell">Who</TableHead>
					<TableHead>What</TableHead>
					<TableHead className="hidden sm:table-cell">Detail</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{events.map((event) => {
					const when = (
						<time dateTime={event.createdAt}>{dateFormat.format(new Date(event.createdAt))}</time>
					);
					const who = actor(event, currentUserId);
					const what = detail(event);
					return (
						<TableRow key={event.id}>
							<TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
								{when}
							</TableCell>
							<TableCell className="hidden sm:table-cell">{who}</TableCell>
							<TableCell className="whitespace-normal">
								{ACTION_LABELS[event.action] ?? event.action}
								{what ? (
									<span className="block text-muted-foreground break-words sm:hidden">{what}</span>
								) : null}
								<span className="block text-xs text-muted-foreground sm:hidden">
									{who} · {when}
								</span>
							</TableCell>
							<TableCell className="hidden min-w-48 whitespace-normal break-words text-muted-foreground sm:table-cell">
								{what}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
