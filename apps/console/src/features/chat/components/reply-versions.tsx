import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@synapse/ui/components/button";

import type { ReplyVersions as Versions } from "../types/chat.types";

export type ReplyVersionsProps = {
	versions: Versions;
	disabled: boolean;
	onSelect: (version: number) => void;
};

/** `‹ 2 / 3 ›`: step through the versions of the last reply; 0 = none in use (regenerate failed). */
export function ReplyVersions({ versions, disabled, onSelect }: ReplyVersionsProps) {
	const { current, total } = versions;
	const previous = current === 0 ? total : current - 1;
	const next = current === 0 ? 0 : current + 1;
	return (
		<div
			role="group"
			aria-label="Reply versions"
			className="flex items-center text-muted-foreground"
		>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label="Previous version"
				disabled={disabled || previous < 1}
				onClick={() => onSelect(previous)}
			>
				<HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.75} aria-hidden="true" />
			</Button>
			<span className="min-w-10 text-center text-xs tabular-nums">
				<span aria-hidden="true">{current === 0 ? `– / ${total}` : `${current} / ${total}`}</span>
				<span className="sr-only">
					{current === 0
						? `No reply in use; ${total} earlier ${total === 1 ? "version" : "versions"}`
						: `Version ${current} of ${total}`}
				</span>
			</span>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label="Next version"
				disabled={disabled || next < 1 || next > total}
				onClick={() => onSelect(next)}
			>
				<HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.75} aria-hidden="true" />
			</Button>
		</div>
	);
}
