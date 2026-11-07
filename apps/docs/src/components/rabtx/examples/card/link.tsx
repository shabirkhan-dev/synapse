import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@rabtx/ui/button";
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	cardParts,
} from "@rabtx/ui/card";

const repos = [
	{ name: "rabtx/ui", about: "Components on native HTML and CSS.", stars: "2.4k" },
	{ name: "rabtx/springs", about: "Spring physics solved into CSS easings.", stars: "812" },
];

export default function CardLink() {
	return repos.map((repo) => (
		<Card key={repo.name} as="article" className="w-72">
			<CardHeader>
				<CardTitle as="h3">
					<a href={`#${repo.name}`} className={cardParts.target}>
						{repo.name}
					</a>
				</CardTitle>
				<CardDescription>{repo.about}</CardDescription>
				<CardAction>
					<Button variant="ghost" size="icon" aria-label={`Star ${repo.name}`}>
						<HugeiconsIcon icon={StarIcon} />
					</Button>
				</CardAction>
			</CardHeader>
			<CardFooter className="text-xs text-subtle-foreground">{repo.stars} stars</CardFooter>
		</Card>
	));
}
