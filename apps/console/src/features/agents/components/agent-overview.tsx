import { BubbleChatIcon, QuoteUpIcon, Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@synapse/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import type { ReactNode } from "react";

import type { AgentsOverview } from "../types/agents.types";

const count = new Intl.NumberFormat("en");
const model = (ref: { provider: string; model: string } | null) =>
	ref ? `${ref.provider}:${ref.model}` : null;

/** Label/value rows; values that are identifiers use the monospace face. */
function Facts({ rows }: { rows: [label: string, value: ReactNode, mono?: boolean][] }) {
	return (
		<dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-y-2.5">
			{rows.map(([label, value, mono]) => (
				// On phones each label sits right above its value; from `sm` they share a grid row.
				<div key={label} className="flex flex-col gap-0.5 sm:contents">
					<dt className="pt-0.5 font-mono text-[0.6875rem] tracking-[0.06em] text-muted-foreground uppercase">
						{label}
					</dt>
					<dd
						className={`min-w-0 break-words ${mono ? "font-mono text-xs leading-5 [overflow-wrap:anywhere]" : ""}`}
					>
						{value}
					</dd>
				</div>
			))}
		</dl>
	);
}

/** The two assistants and what they share, as configured for this deployment. */
export function AgentOverview({ overview }: { overview: AgentsOverview }) {
	const { models, chat, answers, index, guardrails, approvals } = overview;
	const allowed = new Set(guardrails.allowedTools);
	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>
						<HugeiconsIcon icon={BubbleChatIcon} strokeWidth={1.75} aria-hidden="true" />
						Chat assistant
					</CardTitle>
					<CardDescription>
						Streams replies on the Chat page and calls tools as it goes.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<Facts
						rows={[
							["Model", model(models.chat), true],
							["Prompt", chat.promptVersion, true],
							["Tool steps per reply", `Up to ${chat.maxSteps}`],
							[
								"History sent",
								`Last ${chat.history.maxMessages} messages, up to ${count.format(chat.history.maxTokens)} tokens`,
							],
						]}
					/>
					<div className="flex flex-col gap-2">
						<h3 className="text-sm font-medium">Tools</h3>
						<ul className="flex flex-col gap-3">
							{chat.tools.map((tool) => (
								<li key={tool.name} className="flex flex-col gap-1">
									<span className="flex flex-wrap items-center gap-2">
										<code className="font-mono text-xs">{tool.name}</code>
										{allowed.has(tool.name) ? (
											<Badge variant="success">Allowed</Badge>
										) : (
											<Badge variant="destructive">Blocked by guardrails</Badge>
										)}
									</span>
									<span className="text-xs text-muted-foreground">{tool.description}</span>
								</li>
							))}
						</ul>
					</div>
				</CardContent>
			</Card>
			<div className="flex flex-col gap-6">
				<Card>
					<CardHeader>
						<CardTitle>
							<HugeiconsIcon icon={QuoteUpIcon} strokeWidth={1.75} aria-hidden="true" />
							Cited answers
						</CardTitle>
						<CardDescription>
							Answers in the Playground: search, answer with citations, and retry once with a
							stricter prompt when nothing was cited.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Facts
							rows={[
								["Model", model(models.chat), true],
								["Prompts", answers.promptVersions.join(" → "), true],
								[
									"Fallback model",
									model(models.fallbackChat) ?? "None",
									models.fallbackChat !== null,
								],
								["Search", `${answers.searchMode}, top ${answers.topK}`],
								["Reranker", model(models.reranker) ?? "Off", models.reranker !== null],
								["Context", `Up to ${count.format(answers.maxContextTokens)} tokens of passages`],
							]}
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>
							<HugeiconsIcon icon={Settings02Icon} strokeWidth={1.75} aria-hidden="true" />
							Shared by both
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Facts
							rows={[
								["Embedding model", index.embeddingModel, true],
								["Chunker", index.chunkerVersion, true],
								["Longest question", `${count.format(guardrails.maxInputChars)} characters`],
								[
									"Blocked terms",
									guardrails.blockedTerms === 0 ? "None" : count.format(guardrails.blockedTerms),
								],
								[
									"Needs approval",
									approvals.length === 0
										? "Nothing"
										: `${approvals.map((item) => item.label).join(", ")} (admins and owners decide)`,
								],
							]}
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
