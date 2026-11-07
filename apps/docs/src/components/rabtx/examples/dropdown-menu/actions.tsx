"use client";

import {
	Archive02Icon,
	Copy01Icon,
	Delete02Icon,
	Edit02Icon,
	MoreHorizontalIcon,
	Share08Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@rabtx/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@rabtx/ui/dropdown-menu";
import { useState } from "react";

export default function DropdownMenuActions() {
	const [last, setLast] = useState("Nothing yet");
	const run = (action: string) => () => setLast(action);
	return (
		<div className="flex items-center gap-3">
			<span className="text-sm">Q3 roadmap</span>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" aria-label="Actions for Q3 roadmap">
						<HugeiconsIcon icon={MoreHorizontalIcon} />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-52">
					<DropdownMenuItem
						icon={<HugeiconsIcon icon={Edit02Icon} />}
						shortcut="R"
						onSelect={run("Rename")}
					>
						Rename
					</DropdownMenuItem>
					<DropdownMenuItem
						icon={<HugeiconsIcon icon={Copy01Icon} />}
						shortcut="⌘D"
						onSelect={run("Duplicate")}
					>
						Duplicate
					</DropdownMenuItem>
					<DropdownMenuItem icon={<HugeiconsIcon icon={Share08Icon} />} onSelect={run("Share")}>
						Share
					</DropdownMenuItem>
					<DropdownMenuItem icon={<HugeiconsIcon icon={Archive02Icon} />} disabled>
						Archive
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						icon={<HugeiconsIcon icon={Delete02Icon} />}
						shortcut="⌘⌫"
						onSelect={run("Delete")}
					>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<span className="text-xs text-muted-foreground" aria-live="polite">
				Last action: {last}
			</span>
		</div>
	);
}
