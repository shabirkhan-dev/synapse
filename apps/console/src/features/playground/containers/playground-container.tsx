"use client";

import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import Link from "next/link";

import { AnswerPanel } from "../components/answer-panel";
import { FeedbackButtons } from "../components/feedback-buttons";
import { MatchesList } from "../components/matches-list";
import { QuestionForm } from "../components/question-form";
import { useAskQuestionMutation } from "../hooks/mutations/use-ask-question-mutation";
import { useSendFeedbackMutation } from "../hooks/mutations/use-send-feedback-mutation";

/** Ask a question over your documents; see the answer, its sources and passages, and rate it. */
export function PlaygroundContainer() {
	const ask = useAskQuestionMutation();
	const feedback = useSendFeedbackMutation();
	const result = ask.data;
	// Only the rating for the answer on screen counts.
	const rated =
		feedback.data && result && feedback.data.requestId === result.requestId
			? feedback.data.rating
			: null;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-lg font-semibold">Playground</h1>
				<p className="text-xs text-muted-foreground">
					Ask a question; the answer is written from your documents and cites them.
				</p>
			</div>
			<Card>
				<CardContent>
					<QuestionForm
						pending={ask.isPending}
						onSubmit={(input) => {
							feedback.reset();
							ask.mutate(input);
						}}
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
							<CardTitle>Answer</CardTitle>
						</CardHeader>
						<CardContent>
							<AnswerPanel
								result={result}
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
							<CardTitle>Retrieved passages</CardTitle>
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
