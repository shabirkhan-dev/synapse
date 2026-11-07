export type FeedbackRating = "up" | "down";

export type AnswerFeedback = {
	ownerId: string;
	/** `x-request-id` of the answered query (joins with the stored answer once `audit` exists). */
	requestId: string;
	rating: FeedbackRating;
	comment: string | null;
	createdAt: string;
};

export interface FeedbackStore {
	/** One rating per owner and request; rating again replaces it. */
	upsert(input: {
		ownerId: string;
		requestId: string;
		rating: FeedbackRating;
		comment: string | null;
	}): Promise<AnswerFeedback>;
}

/** Thumbs up/down on answers, the input for evaluation datasets later. */
export function createFeedback(store: FeedbackStore) {
	return {
		record: (input: {
			ownerId: string;
			requestId: string;
			rating: FeedbackRating;
			comment?: string | undefined;
		}): Promise<AnswerFeedback> =>
			store.upsert({ ...input, comment: input.comment?.trim() || null }),
	};
}
