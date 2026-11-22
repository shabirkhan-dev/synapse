import {
	BubbleChatIcon,
	CheckmarkCircle02Icon,
	CloudUploadIcon,
	RocketIcon,
	TestTube01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Badge } from "@synapse/ui/components/badge";
import { Button, buttonVariants } from "@synapse/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import { cn } from "@synapse/ui/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

import { SAMPLE_QUESTION } from "../constants/sample-documents";

export type GettingStartedProps = {
	hasDocuments: boolean;
	hasAskedInChat: boolean;
	triedPlayground: boolean;
	/** Adding the samples is running. */
	adding: boolean;
	/** Why adding the samples failed, if it did. */
	error: string | null;
	/** `/chat` with a question the samples answer. */
	chatHref: string;
	onAddSamples: () => void;
	onOpenPlayground: () => void;
	onHide: () => void;
};

/** Three first steps on a new workspace, each ticked off as it happens; can be hidden for good. */
export function GettingStarted({
	hasDocuments,
	hasAskedInChat,
	triedPlayground,
	adding,
	error,
	chatHref,
	onAddSamples,
	onOpenPlayground,
	onHide,
}: GettingStartedProps) {
	const done = [hasDocuments, hasAskedInChat, triedPlayground].filter(Boolean).length;
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<HugeiconsIcon icon={RocketIcon} strokeWidth={1.75} aria-hidden="true" />
					Get started
					<Badge variant="count">{done}/3</Badge>
				</CardTitle>
				<CardDescription>
					Three steps from an empty workspace to answers you can trace back to their sources.
				</CardDescription>
				<CardAction>
					<Button variant="ghost" size="sm" aria-label="Hide Get started" onClick={onHide}>
						Hide
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<ol aria-label="Getting started steps" className="grid gap-3 md:grid-cols-3">
					<Step
						icon={CloudUploadIcon}
						done={hasDocuments}
						title="Add documents"
						text="Upload your own below, or start with three short sample policies."
					>
						{hasDocuments ? null : (
							<Button size="sm" disabled={adding} onClick={onAddSamples}>
								{adding ? "Adding samples…" : "Add sample documents"}
							</Button>
						)}
					</Step>
					<Step
						icon={BubbleChatIcon}
						done={hasAskedInChat}
						title="Ask in Chat"
						text={`Ask in your own words, e.g. “${SAMPLE_QUESTION}” The answer cites the passages it used.`}
					>
						<Link href={chatHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
							Open Chat
						</Link>
					</Step>
					<Step
						icon={TestTube01Icon}
						done={triedPlayground}
						title="Check the sources"
						text="The Playground shows every passage an answer could draw on, and how it was made."
					>
						<Link
							href="/playground"
							onClick={onOpenPlayground}
							className={buttonVariants({ variant: "outline", size: "sm" })}
						>
							Open the Playground
						</Link>
					</Step>
				</ol>
				{error ? (
					<p role="alert" className="mt-3 text-sm text-tone-red">
						The samples were not added: {error}
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}

/** One step: an icon tile (a tick once done), what to do, and its action. */
function Step({
	icon,
	done,
	title,
	text,
	children,
}: {
	icon: IconSvgElement;
	done: boolean;
	title: string;
	text: string;
	children?: ReactNode;
}) {
	return (
		<li className="flex flex-col gap-3 rounded-xl border bg-background p-4">
			<div className="flex items-center justify-between">
				<span
					aria-hidden="true"
					className={cn(
						"flex size-9 items-center justify-center rounded-lg border bg-card shadow-card",
						done ? "text-tone-green" : "text-muted-foreground",
					)}
				>
					<HugeiconsIcon icon={done ? CheckmarkCircle02Icon : icon} size={18} strokeWidth={1.75} />
				</span>
				{done ? <Badge variant="success">Done</Badge> : null}
			</div>
			<div className="flex flex-col gap-1">
				<h3 className="text-sm font-medium">{title}</h3>
				<p className="text-sm text-pretty text-muted-foreground">{text}</p>
			</div>
			{done ? null : <div className="mt-auto">{children}</div>}
		</li>
	);
}
