"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@rabtx/ui/input";
import { useState } from "react";

export default function InputSearch() {
	const [query, setQuery] = useState("Karachi");

	return (
		<div className="grid w-72 gap-2">
			<Input
				pill
				clearable
				type="search"
				placeholder="Search cities"
				aria-label="Search cities"
				leadingIcon={<HugeiconsIcon icon={Search01Icon} />}
				value={query}
				onChange={(event) => setQuery(event.target.value)}
			/>
			<p className="text-xs text-muted-foreground">
				Query: <code>{query || "(empty)"}</code>
			</p>
		</div>
	);
}
