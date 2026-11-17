"use client";

import { FollowUpList } from "../components/follow-up-list";
import { useFollowUpsQuery } from "../hooks/queries/use-follow-ups-query";

export type FollowUpsContainerProps = {
	/** The answered question and its complete answer; null while there is none to build on. */
	answered: { question: string; answer: string } | null;
	onPick: (question: string) => void;
	disabled?: boolean;
};

/** Suggested next questions under an answer. Loading and failures show nothing (a nicety). */
export function FollowUpsContainer({ answered, onPick, disabled }: FollowUpsContainerProps) {
	const followUps = useFollowUpsQuery(answered);
	return (
		<FollowUpList
			questions={followUps.data ?? []}
			onPick={onPick}
			{...(disabled ? { disabled } : {})}
		/>
	);
}
