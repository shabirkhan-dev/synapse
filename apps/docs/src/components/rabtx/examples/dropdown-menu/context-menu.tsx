"use client";

import { Copy01Icon, Delete02Icon, Edit02Icon, Link01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@rabtx/ui/dropdown-menu";
import { useState } from "react";

export default function ContextMenuExample() {
	const [last, setLast] = useState("Right-click the card, or focus it and press Shift+F10");
	const [pinned, setPinned] = useState(false);
	const run = (action: string) => () => setLast(action);
	return (
		<ContextMenu>
			<ContextMenuTrigger
				tabIndex={0}
				aria-label="Q3 roadmap card"
				className="grid h-40 w-full max-w-sm place-items-center rounded-xl border border-dashed border-input p-4 text-center text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<span aria-live="polite">{last}</span>
			</ContextMenuTrigger>
			<ContextMenuContent className="w-56">
				<ContextMenuLabel>Q3 roadmap</ContextMenuLabel>
				<ContextMenuItem
					icon={<HugeiconsIcon icon={Edit02Icon} />}
					shortcut="R"
					onSelect={run("Rename")}
				>
					Rename
				</ContextMenuItem>
				<ContextMenuItem
					icon={<HugeiconsIcon icon={Copy01Icon} />}
					shortcut="⌘D"
					onSelect={run("Duplicate")}
				>
					Duplicate
				</ContextMenuItem>
				<ContextMenuSub>
					<ContextMenuSubTrigger icon={<HugeiconsIcon icon={Link01Icon} />}>
						Copy link
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-44">
						<ContextMenuItem onSelect={run("Copied the view link")}>View link</ContextMenuItem>
						<ContextMenuItem onSelect={run("Copied the edit link")}>Edit link</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>
				<ContextMenuSeparator />
				<ContextMenuCheckboxItem
					checked={pinned}
					onCheckedChange={(next) => {
						setPinned(next);
						setLast(next ? "Pinned" : "Unpinned");
					}}
				>
					Pin to sidebar
				</ContextMenuCheckboxItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					variant="destructive"
					icon={<HugeiconsIcon icon={Delete02Icon} />}
					shortcut="⌘⌫"
					onSelect={run("Moved to trash")}
				>
					Move to trash
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
