"use client";

import { FileSearchIcon, RepeatIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { CopyButton } from "@/components/shared/copy-button";
import { DocumentScope } from "@/components/shared/document-scope";
import { PageHeader } from "@/components/shared/page-header";
import { useDocumentsQuery } from "@/features/documents";
import { FollowUpsContainer } from "@/features/follow-ups";

import { AnswerPanel } from "../components/answer-panel";
import { FeedbackButtons } from "../components/feedback-buttons";
import { MatchesList } from "../components/matches-list";
import { QuestionForm } from "../components/question-form";
import { PLAYGROUND_LIMITS, PLAYGROUND_SCOPE_PARAM } from "../constants/playground.constants";
import { useAskQuestionMutation } from "../hooks/mutations/use-ask-question-mutation";
import { useSendFeedbackMutation } from "../hooks/mutations/use-send-feedback-mutation";
import type { QuestionInput } from "../types/playground.types";

/** Ask a question over your documents; see the answer, its sources and passages, and rate it. */
export function PlaygroundContainer() {
	const ask = useAskQuestionMutation();
	const feedback = useSendFeedbackMutation();
	const documents = useDocumentsQuery();
	// "Ask about this document" arrives with the document already chosen.
	const [scope, setScope] = useState<string[]>(useSearchParams().getAll(PLAYGROUND_SCOPE_PARAM));
	// The last question as asked (passages, scope), to ask it again or follow it up the same way.
	const [lastInput, setLastInput] = useState<QuestionInput | null>(null);
	const result = ask.data;
	const askWith = (input: QuestionInput) => {
		feedback.reset();
		setLastInput(input);
		ask.mutate(input);
	};
	// Only the rating for the answer on screen counts.
	const rated =
		feedback.data && result && feedback.data.requestId === result.requestId
			? feedback.data.rating
			: null;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Playground">
				Ask a question; the answer is written from your documents and cites them.
			</PageHeader>
			<Card>
				<CardContent className="flex flex-col gap-4">
					<DocumentScope
						documents={documents.data ?? []}
						selected={scope}
						onChange={setScope}
						max={PLAYGROUND_LIMITS.SCOPE_MAX}
					/>
					<QuestionForm
						pending={ask.isPending}
						onSubmit={(input) => askWith({ ...input, documentIds: scope })}
					/>
				</CardContent>
			</Card>
			{ask.isPending ? (
				<p role="status" className="text-xs text-muted-foreground">
					Searching your documents and writing an answer…
				</p>
			) : null}
			{ask.isError ? (
				<Alert variant="destructive">
					<AlertTitle>No answer this time</AlertTitle>
					<AlertDescription>{ask.error.message}</AlertDescription>
				</Alert>
			) : null}
			{result && !ask.isPending ? (
				<>
					<Card>
						<CardHeader>
							<CardTitle>
								<HugeiconsIcon icon={SparklesIcon} strokeWidth={1.75} aria-hidden="true" />
								Answer
							</CardTitle>
							{result.scopedTo.length > 0 ? (
								<CardDescription>
									{result.scopedTo.length === 1
										? "Searched 1 chosen document only."
										: `Searched ${result.scopedTo.length} chosen documents only.`}
								</CardDescription>
							) : null}
						</CardHeader>
						<CardContent>
							<AnswerPanel
								result={result}
								actions={
									<>
										<CopyButton text={result.answer ?? ""} label="Copy answer" />
										{lastInput ? (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="gap-1.5 text-muted-foreground"
												onClick={() => askWith(lastInput)}
											>
												<HugeiconsIcon icon={RepeatIcon} strokeWidth={1.75} aria-hidden="true" />
												Ask again
											</Button>
										) : null}
									</>
								}
								followUps={
									result.provenance && lastInput ? (
										<FollowUpsContainer
											answered={{ question: result.question, answer: result.answer ?? "" }}
											onPick={(question) => askWith({ ...lastInput, query: question })}
										/>
									) : null
								}
								feedback={
									<FeedbackButtons
										rated={rated}
										pending={feedback.isPending}
										error={feedback.error ? feedback.error.message : null}
										onRate={(rating) => feedback.mutate({ requestId: result.requestId, rating })}
									/>
								}
							/>
							{result.provenance === null ? (
								<p className="mt-3 text-xs text-muted-foreground">
									<Link href="/documents" className="underline underline-offset-4">
										Add a document
									</Link>{" "}
									to get answers from it.
								</p>
							) : null}
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>
								<HugeiconsIcon icon={FileSearchIcon} strokeWidth={1.75} aria-hidden="true" />
								Retrieved passages
							</CardTitle>
							<CardDescription>What the answer could draw on, best first.</CardDescription>
						</CardHeader>
						<CardContent>
							<MatchesList matches={result.matches} />
						</CardContent>
					</Card>
				</>
			) : null}
		</div>
	);
}
