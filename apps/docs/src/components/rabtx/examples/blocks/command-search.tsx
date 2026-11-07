"use client";

import { Button } from "@rabtx/ui/button";
import { type CommandItem, CommandBlock } from "@rabtx/ui/blocks/command";
import { useRef, useState } from "react";

const people = [
	"Ada Lovelace",
	"Alan Turing",
	"Grace Hopper",
	"Katherine Johnson",
	"Linus Torvalds",
];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Results from your own search: `filter={false}`, `loading` while it runs. */
export default function CommandSearchExample() {
	const [results, setResults] = useState<CommandItem[]>([]);
	const [loading, setLoading] = useState(false);
	const latest = useRef(0);

	const search = async (query: string) => {
		const ticket = ++latest.current;
		if (!query.trim()) return setResults([]);
		setLoading(true);
		await wait(600); // your API
		if (ticket !== latest.current) return;
		const words = query.toLowerCase();
		setResults(
			people
				.filter((name) => name.toLowerCase().includes(words))
				.map((name) => ({ id: name, label: name, group: "People", description: "Engineer" })),
		);
		setLoading(false);
	};

	return (
		<CommandBlock
			shortcut={false}
			commands={results}
			filter={false}
			loading={loading}
			recentLimit={0}
			label="People"
			placeholder="Search people…"
			empty={(query) => (query ? `Nobody called “${query}”.` : "Type a name, such as Ada.")}
			onQueryChange={(query) => void search(query)}
			onOpenChange={(open) => {
				if (!open) setResults([]);
			}}
			trigger={<Button variant="secondary">Search people</Button>}
		/>
	);
}
