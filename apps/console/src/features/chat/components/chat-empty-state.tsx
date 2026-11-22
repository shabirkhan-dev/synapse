import { BrainIcon, Calendar03Icon, FileSearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { BrandMark } from "@/components/shared/brand-mark";

import { SUGGESTIONS } from "../constants/chat.constants";

/** One icon per suggestion, in the same order. */
const SUGGESTION_ICONS = [FileSearchIcon, Calendar03Icon, BrainIcon] as const;

/** A new chat: a greeting, what Synapse does here, and questions to start from. */
export function ChatEmptyState({ onPick }: { onPick: (text: string) => void }) {
	return (
		<div className="flex flex-col items-center gap-6 text-center">
			<BrandMark compact />
			<div className="flex flex-col gap-2">
				<h2 className="text-2xl font-semibold tracking-tight text-balance">
					What would you like to know?
				</h2>
				<p className="mx-auto max-w-md text-sm text-pretty text-muted-foreground">
					Synapse answers from your documents and shows the passages it used. It remembers a fact
					about you only when you ask it to.
				</p>
			</div>
			<ul aria-label="Suggested questions" className="grid w-full gap-2 sm:grid-cols-3">
				{SUGGESTIONS.map((text, index) => (
					<li key={text} className="flex">
						<button
							type="button"
							onClick={() => onPick(text)}
							className="flex w-full flex-col items-start gap-3 rounded-xl border bg-card p-3.5 text-start text-sm shadow-card transition-[background-color,border-color,scale] duration-150 outline-none hover:border-foreground/15 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/25 motion-safe:active:scale-[0.96]"
						>
							<HugeiconsIcon
								icon={SUGGESTION_ICONS[index] ?? FileSearchIcon}
								size={18}
								strokeWidth={1.75}
								aria-hidden="true"
								className="text-muted-foreground"
							/>
							<span className="text-pretty">{text}</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
