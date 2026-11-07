"use client";

import { Button } from "@rabtx/ui/button";
import {
	Popover,
	PopoverClose,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@rabtx/ui/popover";
import { useState } from "react";

export default function PopoverControlled() {
	const [open, setOpen] = useState(false);
	const [status, setStatus] = useState("Not shared");
	return (
		<div className="flex flex-col items-center gap-3">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button>Share</Button>
				</PopoverTrigger>
				<PopoverContent side="top" className="w-72">
					<PopoverHeader>
						<PopoverTitle>Share “Q3 roadmap”</PopoverTitle>
						<PopoverDescription>Anyone with the link can view it.</PopoverDescription>
					</PopoverHeader>
					<div className="flex justify-end gap-2">
						<PopoverClose asChild>
							<Button variant="ghost" size="sm">
								Cancel
							</Button>
						</PopoverClose>
						<Button
							size="sm"
							onClick={() => {
								setStatus("Link copied");
								setOpen(false);
							}}
						>
							Copy link
						</Button>
					</div>
				</PopoverContent>
			</Popover>
			<p className="text-xs text-muted-foreground" aria-live="polite">
				{open ? "Open" : "Closed"} · {status}
			</p>
		</div>
	);
}
