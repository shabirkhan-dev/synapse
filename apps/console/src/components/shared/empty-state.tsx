import type { Files01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@synapse/ui/components/empty";
import type { ReactNode } from "react";

export type EmptyStateProps = {
	icon: typeof Files01Icon;
	title: string;
	/** What to do next. */
	children: ReactNode;
};

/** A list with nothing in it yet: what it will hold and how to fill it. */
export function EmptyState({ icon, title, children }: EmptyStateProps) {
	return (
		<Empty className="py-8">
			<EmptyHeader>
				<EmptyMedia variant="icon" className="bg-primary/10 text-link">
					<HugeiconsIcon icon={icon} strokeWidth={1.75} aria-hidden="true" />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{children}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
