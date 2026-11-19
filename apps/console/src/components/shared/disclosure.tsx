import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

export type DisclosureProps = {
	summary: ReactNode;
	children: ReactNode;
	className?: string;
};

/** Extra detail behind a muted one-line summary; a chevron (not the browser's triangle) turns open. */
export function Disclosure({ summary, children, className }: DisclosureProps) {
	return (
		<details className={`group text-xs ${className ?? ""}`}>
			<summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-sm text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
				<HugeiconsIcon
					icon={ArrowRight01Icon}
					size={14}
					strokeWidth={2}
					className="transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none"
					aria-hidden="true"
				/>
				{summary}
			</summary>
			<div className="mt-2">{children}</div>
		</details>
	);
}
