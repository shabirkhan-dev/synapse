import { ChartUpIcon, FlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CardDescription, CardHeader, CardTitle, SpotlightCard, cardParts } from "@rabtx/ui/card";

export default function CardSpotlight() {
	return (
		<>
			<SpotlightCard as="article" size="lg" className="w-64">
				<CardHeader>
					<HugeiconsIcon icon={FlashIcon} className="mb-2 size-5 text-primary" aria-hidden="true" />
					<CardTitle as="h3">
						<a href="#edge" className={cardParts.target}>
							Edge functions
						</a>
					</CardTitle>
					<CardDescription>
						The light follows the pointer and lights the nearest edge.
					</CardDescription>
				</CardHeader>
			</SpotlightCard>
			<SpotlightCard as="article" size="lg" className="w-64 [--primary:var(--violet)]">
				<CardHeader>
					<HugeiconsIcon
						icon={ChartUpIcon}
						className="mb-2 size-5 text-primary"
						aria-hidden="true"
					/>
					<CardTitle as="h3">
						<a href="#analytics" className={cardParts.target}>
							Analytics
						</a>
					</CardTitle>
					<CardDescription>Recolored with one theme token on the card.</CardDescription>
				</CardHeader>
			</SpotlightCard>
		</>
	);
}
