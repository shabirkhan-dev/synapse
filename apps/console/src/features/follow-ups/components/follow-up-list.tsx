import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@synapse/ui/components/button";

export type FollowUpListProps = {
	questions: string[];
	onPick: (question: string) => void;
	disabled?: boolean;
};

/** "Ask next": the suggested questions, each one click away. Nothing renders when there are none. */
export function FollowUpList({ questions, onPick, disabled = false }: FollowUpListProps) {
	if (questions.length === 0) return null;
	return (
		<section aria-labelledby="follow-ups-heading" className="flex flex-col gap-2">
			<h3 id="follow-ups-heading" className="text-xs font-medium text-muted-foreground">
				Ask next
			</h3>
			<ul className="flex flex-col gap-1.5">
				{questions.map((question) => (
					<li key={question}>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={disabled}
							onClick={() => onPick(question)}
							className="h-auto w-full justify-between gap-3 rounded-lg py-2 text-left font-normal whitespace-normal"
						>
							<span>{question}</span>
							<HugeiconsIcon
								icon={ArrowRight02Icon}
								strokeWidth={1.75}
								className="shrink-0 text-muted-foreground"
								aria-hidden="true"
							/>
						</Button>
					</li>
				))}
			</ul>
		</section>
	);
}
