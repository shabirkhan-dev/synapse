import { Button } from "@rabtx/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@rabtx/ui/card";

const rows = [
	["Plan", "Team, yearly"],
	["Seats", "12"],
	["Billing email", "billing@acme.co"],
];

export default function CardDefault() {
	return (
		<Card as="section" aria-labelledby="order-title" className="w-full max-w-sm">
			<CardHeader>
				<CardTitle as="h3" id="order-title">
					Review order
				</CardTitle>
				<CardDescription>Check the details before you confirm.</CardDescription>
				<CardAction>
					<Button variant="ghost" size="sm">
						Edit
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<dl className="divide-y divide-border">
					{rows.map(([label, value]) => (
						<div key={label} className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0">
							<dt className="text-muted-foreground">{label}</dt>
							<dd className="font-medium">{value}</dd>
						</div>
					))}
				</dl>
			</CardContent>
			<CardFooter className="justify-end">
				<Button variant="secondary" size="sm">
					Back
				</Button>
				<Button size="sm">Confirm order</Button>
			</CardFooter>
		</Card>
	);
}
