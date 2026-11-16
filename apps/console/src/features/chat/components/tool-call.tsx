import {
	Alert02Icon,
	ArrowRight01Icon,
	Brain02Icon,
	Clock01Icon,
	Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getToolName, isToolUIPart } from "ai";

import { TOOL_LABELS } from "../constants/chat.constants";
import type { ChatPart } from "../types/chat.types";

const ICONS = {
	searchDocuments: Search01Icon,
	rememberFact: Brain02Icon,
	currentTime: Clock01Icon,
};

type ToolPart = Extract<ChatPart, { toolCallId: string }>;

/** A tool part of an assistant message, e.g. "Searched your documents for “refunds” · 3 passages". */
export function ToolCall({ part }: { part: ChatPart }) {
	if (!isToolUIPart(part)) return null;
	const tool = part as ToolPart;
	const name = getToolName(tool);
	const labels = TOOL_LABELS[name] ?? { running: name, done: name, failed: `${name} failed` };
	const failed = tool.state === "output-error" || tool.state === "output-denied";
	const done = tool.state === "output-available";
	const label = failed ? labels.failed : done ? labels.done : `${labels.running}…`;
	const icon = failed ? Alert02Icon : (ICONS[name as keyof typeof ICONS] ?? Search01Icon);
	const query = (tool.input as { query?: unknown } | undefined)?.query;
	const passages =
		done && Array.isArray(tool.output) ? (tool.output as { title?: unknown }[]) : null;
	const remembered = done
		? (tool.output as { remembered?: unknown } | undefined)?.remembered
		: null;

	const summary = (
		<>
			<HugeiconsIcon icon={icon} size={15} strokeWidth={1.75} aria-hidden="true" />
			<span>
				{label}
				{typeof query === "string" ? <> for “{query}”</> : null}
				{typeof remembered === "string" ? <>: “{remembered}”</> : null}
				{passages ? <> · {passageCount(passages.length)}</> : null}
			</span>
		</>
	);
	const tone = failed ? "text-destructive" : "text-muted-foreground";

	// A search with passages opens to list them, like a collapsed step; other tool rows are plain.
	return passages && passages.length > 0 ? (
		<details className={`group text-[0.85rem] ${tone}`}>
			<summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-md py-0.5 select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
				{summary}
				<HugeiconsIcon
					icon={ArrowRight01Icon}
					size={14}
					strokeWidth={2}
					className="transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none"
					aria-hidden="true"
				/>
				<span className="sr-only">Show sources</span>
			</summary>
			<ul className="mt-1.5 ms-6 flex list-disc flex-col gap-0.5 ps-4">
				{uniqueTitles(passages).map((title) => (
					<li key={title}>{title}</li>
				))}
			</ul>
		</details>
	) : (
		<p className={`flex items-center gap-2 text-[0.85rem] ${tone}`}>{summary}</p>
	);
}

const plural = new Intl.PluralRules("en");
function passageCount(count: number): string {
	return plural.select(count) === "one" ? "1 passage" : `${count} passages`;
}

function uniqueTitles(passages: { title?: unknown }[]): string[] {
	return [...new Set(passages.map((p) => (typeof p.title === "string" ? p.title : "Untitled")))];
}
