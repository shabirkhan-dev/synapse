import { Button } from "@synapse/ui/components/button";

import type { Rating } from "../types/playground.types";

export type FeedbackButtonsProps = {
	onRate: (rating: Rating) => void;
	/** The rating the API stored, if any. */
	rated: Rating | null;
	pending: boolean;
	error: string | null;
};

/** Was this answer useful? Rating again replaces the earlier rating. */
export function FeedbackButtons({ onRate, rated, pending, error }: FeedbackButtonsProps) {
	return (
		<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
			<span>Was this useful?</span>
			<Button
				size="sm"
				variant={rated === "up" ? "default" : "outline"}
				aria-pressed={rated === "up"}
				disabled={pending}
				onClick={() => onRate("up")}
			>
				Yes
			</Button>
			<Button
				size="sm"
				variant={rated === "down" ? "default" : "outline"}
				aria-pressed={rated === "down"}
				disabled={pending}
				onClick={() => onRate("down")}
			>
				No
			</Button>
			<span role="status">
				{error ? (
					<span className="text-destructive">{error}</span>
				) : rated ? (
					"Thanks, noted."
				) : null}
			</span>
		</div>
	);
}
