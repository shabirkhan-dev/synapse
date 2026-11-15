import { AiNetworkIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/** The product mark: an accent tile and the name. */
export function BrandMark() {
	return (
		<span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
			<span
				aria-hidden="true"
				className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
			>
				<HugeiconsIcon icon={AiNetworkIcon} size={16} strokeWidth={2} />
			</span>
			Synapse
		</span>
	);
}
