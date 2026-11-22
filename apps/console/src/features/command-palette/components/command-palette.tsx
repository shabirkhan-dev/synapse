"use client";

import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
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
	/** What is typed; documents and conversations are searched on the server for it. */
	search: string;
	onSearchChange: (search: string) => void;
	/** The server search for the typed text is running. */
	searching: boolean;
};

/** A search row for the sidebar and the palette it opens: pages, conversations, documents. */
export function CommandPalette({
	open,
	onOpenChange,
	groups,
	loading,
	onSelect,
	shortcut,
	search,
	onSearchChange,
	searching,
}: CommandPaletteProps) {
	return (
		<>
			{/* A sidebar row: "Search" with its key, as in the references. */}
			<button
				type="button"
				onClick={() => onOpenChange(true)}
				aria-label="Search"
				aria-keyshortcuts="/ Meta+K Control+K"
				title={`Search (/ or ${shortcut})`}
				className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-sidebar-foreground/90 outline-hidden transition-colors duration-150 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
			>
				<HugeiconsIcon
					icon={Search01Icon}
					size={18}
					strokeWidth={1.75}
					aria-hidden="true"
					className="text-sidebar-foreground/70"
				/>
				Search
				<span className="ms-auto" aria-hidden="true">
					<kbd className="flex h-5 min-w-5 items-center justify-center rounded-md border bg-background px-1 font-mono text-[0.6875rem] text-muted-foreground">
						/
					</kbd>
				</span>
			</button>
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
						<CommandInput
							placeholder="Go to a page, conversation or document…"
							value={search}
							onValueChange={onSearchChange}
						/>
						<CommandList className="max-h-80">
							<CommandEmpty>
								{loading || searching ? "Searching…" : "Nothing matches."}
							</CommandEmpty>
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
