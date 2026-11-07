import {
	Card,
	CardAction,
	CardDescription,
	CardHeader,
	CardStack,
	CardTitle,
} from "@rabtx/ui/card";

const notifications = [
	{ id: "1", title: "Deploy finished", about: "web, production, 42s ago", time: "now" },
	{ id: "2", title: "Ana commented", about: "“Ship it after the copy pass.”", time: "4m" },
	{ id: "3", title: "Invoice paid", about: "INV-2041, $1,840.00", time: "1h" },
	{ id: "4", title: "New sign-in", about: "Chrome on macOS, Lisbon", time: "3h" },
];

export default function CardStackExample() {
	return (
		<CardStack noun="notifications" aria-label="Notifications" className="w-full max-w-xs">
			{notifications.map((item) => (
				<Card key={item.id} size="sm">
					<CardHeader>
						<CardTitle>{item.title}</CardTitle>
						<CardDescription>{item.about}</CardDescription>
						<CardAction className="text-xs text-subtle-foreground">{item.time}</CardAction>
					</CardHeader>
				</Card>
			))}
		</CardStack>
	);
}
