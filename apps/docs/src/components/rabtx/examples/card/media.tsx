import { Badge } from "@rabtx/ui/badge";
import { Button } from "@rabtx/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@rabtx/ui/card";

export default function CardMedia() {
	return (
		<Card as="article" aria-labelledby="studio-title" className="w-full max-w-xs">
			<div
				data-slot="card-media"
				role="img"
				aria-label="A sunlit studio with long desks"
				className="aspect-video bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--primary)_45%,transparent),transparent_60%),radial-gradient(circle_at_75%_70%,color-mix(in_oklab,var(--violet)_40%,transparent),transparent_55%)] bg-muted"
			/>
			<CardHeader>
				<CardTitle as="h3" id="studio-title">
					Studio, Lisbon
				</CardTitle>
				<CardDescription>Desks for 12 people, booked for the March offsite.</CardDescription>
			</CardHeader>
			<CardFooter className="justify-between">
				<Badge tone="success" dot>
					Confirmed
				</Badge>
				<Button variant="secondary" size="sm">
					View booking
				</Button>
			</CardFooter>
		</Card>
	);
}
