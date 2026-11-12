import { Button } from "@synapse/ui/components/button";

import { SUGGESTIONS } from "../constants/chat.constants";

/** A new chat: what Synapse can do here, with questions to start from. */
export function ChatEmptyState({ onPick }: { onPick: (text: string) => void }) {
	return (
		<div className="flex flex-col gap-4 py-8">
			<div className="flex flex-col gap-1">
				<p className="text-sm font-medium">Ask about your documents</p>
				<p className="max-w-prose text-sm text-muted-foreground text-pretty">
					Synapse searches your documents to answer and shows which ones it used. It remembers a
					fact about you only when you ask it to.
				</p>
			</div>
			<ul className="flex flex-wrap gap-2" aria-label="Suggested questions">
				{SUGGESTIONS.map((text) => (
					<li key={text}>
						<Button
							type="button"
							variant="outline"
							className="h-auto py-1 text-start whitespace-normal"
							onClick={() => onPick(text)}
						>
							{text}
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}
