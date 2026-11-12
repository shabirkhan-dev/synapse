import { Alert02Icon, Brain02Icon, Clock01Icon, Search01Icon } from "@hugeicons/core-free-icons";
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

	return (
		<div
			className={`flex flex-col gap-1 text-xs ${failed ? "text-destructive" : "text-muted-foreground"}`}
		>
			<p className="flex items-center gap-1.5">
				<HugeiconsIcon icon={icon} size={14} strokeWidth={1.5} aria-hidden="true" />
				<span>
					{label}
					{typeof query === "string" ? <> for “{query}”</> : null}
					{typeof remembered === "string" ? <>: “{remembered}”</> : null}
					{passages ? <> · {passageCount(passages.length)}</> : null}
				</span>
			</p>
			{passages && passages.length > 0 ? (
				<details className="ms-5">
					<summary className="cursor-pointer select-none hover:text-foreground">
						Show sources
					</summary>
					<ul className="mt-1 flex list-disc flex-col gap-0.5 ps-4">
						{uniqueTitles(passages).map((title) => (
							<li key={title}>{title}</li>
						))}
					</ul>
				</details>
			) : null}
		</div>
	);
}

const plural = new Intl.PluralRules("en");
function passageCount(count: number): string {
	return plural.select(count) === "one" ? "1 passage" : `${count} passages`;
}

function uniqueTitles(passages: { title?: unknown }[]): string[] {
	return [...new Set(passages.map((p) => (typeof p.title === "string" ? p.title : "Untitled")))];
}
