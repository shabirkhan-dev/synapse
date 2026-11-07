"use client";

import {
	Link01Icon,
	TextBoldIcon,
	TextItalicIcon,
	TextStrikethroughIcon,
	TextUnderlineIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { buttonClass } from "@rabtx/ui/button/styles";
import {
	Tooltip,
	TooltipContent,
	TooltipKbd,
	TooltipProvider,
	TooltipTrigger,
} from "@rabtx/ui/tooltip";
import { useState } from "react";

const marks = [
	{ id: "bold", label: "Bold", keys: ["⌘", "B"], shortcut: "Meta+B", icon: TextBoldIcon },
	{ id: "italic", label: "Italic", keys: ["⌘", "I"], shortcut: "Meta+I", icon: TextItalicIcon },
	{
		id: "underline",
		label: "Underline",
		keys: ["⌘", "U"],
		shortcut: "Meta+U",
		icon: TextUnderlineIcon,
	},
	{
		id: "strike",
		label: "Strikethrough",
		keys: ["⌘", "⇧", "X"],
		shortcut: "Meta+Shift+X",
		icon: TextStrikethroughIcon,
	},
];

export default function TooltipToolbar() {
	const [on, setOn] = useState<string[]>(["bold"]);
	const toggle = (id: string) =>
		setOn((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
	const ghost = buttonClass({ variant: "ghost", size: "icon" });

	return (
		<TooltipProvider delayDuration={300} skipDelayDuration={400}>
			<div
				role="toolbar"
				aria-label="Formatting"
				className="flex items-center gap-1 rounded-[var(--radius-control)] border border-border bg-card p-1"
			>
				{marks.map(({ id, label, keys, shortcut, icon }) => (
					<Tooltip key={id} asLabel>
						<TooltipTrigger
							className={`${ghost} aria-pressed:bg-muted aria-pressed:text-foreground`}
							aria-pressed={on.includes(id)}
							aria-keyshortcuts={shortcut}
							onClick={() => toggle(id)}
						>
							<HugeiconsIcon icon={icon} size={16} aria-hidden="true" />
						</TooltipTrigger>
						<TooltipContent side="bottom" arrow>
							{label}
							{keys.map((key) => (
								<TooltipKbd key={key}>{key}</TooltipKbd>
							))}
						</TooltipContent>
					</Tooltip>
				))}
				<span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
				<Tooltip asLabel>
					<TooltipTrigger className={ghost}>
						<HugeiconsIcon icon={Link01Icon} size={16} aria-hidden="true" />
					</TooltipTrigger>
					<TooltipContent side="bottom" align="end" arrow>
						Insert link
						<TooltipKbd>⌘</TooltipKbd>
						<TooltipKbd>K</TooltipKbd>
					</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
}
