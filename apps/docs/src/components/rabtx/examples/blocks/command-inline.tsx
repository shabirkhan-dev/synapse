"use client";

import { CommandPanel } from "@rabtx/ui/blocks/command";
import { useMemo, useState } from "react";
import { exampleCommands } from "./command-data";

/** The same panel without the dialog, with scope tabs. */
export default function CommandInlineExample() {
	const [ran, setRan] = useState("nothing yet");
	const commands = useMemo(() => exampleCommands(setRan), []);
	return (
		<div className="grid w-full justify-items-center gap-3">
			<CommandPanel commands={commands} label="Inline commands" scopes recentLimit={0} />
			<p className="text-sm text-muted-foreground" aria-live="polite">
				Ran: {ran}
			</p>
		</div>
	);
}
