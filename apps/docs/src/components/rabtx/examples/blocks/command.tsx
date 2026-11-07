"use client";

import { CommandBlock } from "@rabtx/ui/blocks/command";
import { useMemo, useState } from "react";
import { exampleCommands } from "./command-data";

export default function CommandPaletteExample() {
	const [ran, setRan] = useState("nothing yet");
	const commands = useMemo(() => exampleCommands(setRan), []);
	return (
		<div className="grid justify-items-center gap-3">
			{/* ⌘J here: ⌘K is the docs search. */}
			<CommandBlock commands={commands} shortcut="j" defaultRecent={["theme-dark"]} />
			<p className="text-sm text-muted-foreground" aria-live="polite">
				Ran: {ran}
			</p>
		</div>
	);
}
