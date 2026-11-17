"use client";

import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@synapse/ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@synapse/ui/components/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@synapse/ui/components/dialog";

export type PaletteEntry = {
	id: string;
	label: string;
	/** Shown muted after the label (e.g. "conversation"); also searched. */
	hint?: string;
	href: string;
	icon: IconSvgElement;
};

export type PaletteGroup = { heading: string; entries: PaletteEntry[] };

export type CommandPaletteProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	groups: PaletteGroup[];
	/** Conversations and documents are still loading. */
	loading: boolean;
	onSelect: (entry: PaletteEntry) => void;
	/** "⌘K" or "Ctrl K", for the trigger. */
	shortcut: string;
};

/** A search button for the top bar and the palette it opens: pages, conversations, documents. */
export function CommandPalette({
	open,
	onOpenChange,
	groups,
	loading,
	onSelect,
	shortcut,
}: CommandPaletteProps) {
	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => onOpenChange(true)}
				aria-label="Search"
				aria-keyshortcuts="Meta+K Control+K"
				className="gap-2 rounded-full text-muted-foreground"
			>
				<HugeiconsIcon icon={Search01Icon} strokeWidth={1.75} aria-hidden="true" />
				<span className="hidden sm:inline">Search</span>
				<kbd className="hidden rounded border bg-muted px-1.5 font-sans text-[0.7rem] sm:inline">
					{shortcut}
				</kbd>
			</Button>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					showCloseButton={false}
					className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
				>
					<DialogTitle className="sr-only">Search Synapse</DialogTitle>
					<DialogDescription className="sr-only">
						Go to a page, a conversation or a document. Use the arrow keys and Enter.
					</DialogDescription>
					<Command loop className="rounded-none">
						<CommandInput placeholder="Go to a page, conversation or document…" />
						<CommandList className="max-h-80">
							<CommandEmpty>{loading ? "Loading…" : "Nothing matches."}</CommandEmpty>
							{groups.map((group) =>
								group.entries.length > 0 ? (
									<CommandGroup key={group.heading} heading={group.heading}>
										{group.entries.map((entry) => (
											<CommandItem
												key={entry.id}
												value={`${entry.label} ${entry.hint ?? ""} ${entry.id}`}
												onSelect={() => onSelect(entry)}
												className="gap-2.5"
											>
												<HugeiconsIcon
													icon={entry.icon}
													strokeWidth={1.75}
													className="text-muted-foreground"
													aria-hidden="true"
												/>
												<span className="truncate">{entry.label}</span>
												{entry.hint ? (
													<span className="ms-auto shrink-0 text-xs text-muted-foreground">
														{entry.hint}
													</span>
												) : null}
											</CommandItem>
										))}
									</CommandGroup>
								) : null,
							)}
						</CommandList>
					</Command>
				</DialogContent>
			</Dialog>
		</>
	);
}
