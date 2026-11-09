import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import type { ReactNode } from "react";

export type AuthCardProps = {
	title: string;
	description: string;
	children: ReactNode;
	/** Links to the other auth pages. */
	footer?: ReactNode;
};

/** The frame every signed-out page shares. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>{children}</CardContent>
			{footer ? (
				<CardFooter className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
					{footer}
				</CardFooter>
			) : null}
		</Card>
	);
}
