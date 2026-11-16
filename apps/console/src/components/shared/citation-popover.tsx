import { Popover, PopoverContent, PopoverTrigger } from "@synapse/ui/components/popover";

export type CitedPassage = {
	/** The `[n]` the answer uses. */
	citation: number;
	title: string;
	source: string | null;
	content: string;
};

const isWebLink = (href: string | null): href is string =>
	typeof href === "string" && /^https?:\/\//i.test(href);

/** An inline `[n]` that opens the passage it cites: document, source and the text itself. */
export function CitationPopover({ passage }: { passage: CitedPassage }) {
	return (
		<Popover>
			<PopoverTrigger
				aria-label={`Source ${passage.citation}: ${passage.title}`}
				className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-1 items-center justify-center rounded bg-primary/10 px-1 align-baseline text-[0.65rem] font-semibold text-primary tabular-nums hover:bg-primary/20"
			>
				{passage.citation}
			</PopoverTrigger>
			<PopoverContent className="w-80 gap-2" side="top">
				<p className="flex items-baseline gap-2">
					<span className="font-semibold text-primary tabular-nums">[{passage.citation}]</span>
					<span className="font-medium text-foreground">{passage.title}</span>
				</p>
				{passage.source ? (
					isWebLink(passage.source) ? (
						<a
							href={passage.source}
							target="_blank"
							rel="noopener noreferrer"
							className="truncate text-muted-foreground underline-offset-4 hover:underline"
						>
							{passage.source}
						</a>
					) : (
						<span className="truncate text-muted-foreground">{passage.source}</span>
					)
				) : null}
				<blockquote className="max-h-48 overflow-y-auto border-s-2 border-primary/40 ps-2 leading-relaxed whitespace-pre-wrap text-muted-foreground">
					{passage.content}
				</blockquote>
			</PopoverContent>
		</Popover>
	);
}
