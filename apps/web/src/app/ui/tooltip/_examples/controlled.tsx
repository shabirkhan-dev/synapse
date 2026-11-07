"use client";

import { Button } from "@rabtx/ui/button";
import { Checkbox } from "@rabtx/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@rabtx/ui/tooltip";
import { useState } from "react";

export default function TooltipControlled() {
	const [open, setOpen] = useState(false);
	const [pinned, setPinned] = useState(false);
	return (
		<div className="flex flex-wrap items-center gap-6">
			<Tooltip open={pinned || open} onOpenChange={setOpen}>
				<TooltipTrigger asChild>
					<Button variant="secondary">Sync now</Button>
				</TooltipTrigger>
				<TooltipContent side="right" arrow>
					Last synced 2 minutes ago
				</TooltipContent>
			</Tooltip>
			<Checkbox checked={pinned} onCheckedChange={setPinned}>
				Keep it open
			</Checkbox>
		</div>
	);
}
