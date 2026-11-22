import { AiNetworkIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/** The product mark: a dark tile and the name (`compact`: the tile only, e.g. beside the team). */
export function BrandMark({ compact = false }: { compact?: boolean }) {
	return (
		<span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
			<span
				aria-hidden="true"
				className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background"
			>
				<HugeiconsIcon icon={AiNetworkIcon} size={16} strokeWidth={2} />
			</span>
			{compact ? null : "Synapse"}
		</span>
	);
}
