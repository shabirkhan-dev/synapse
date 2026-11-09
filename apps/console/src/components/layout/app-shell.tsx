import { Button } from "@synapse/ui/components/button";
import Link from "next/link";
import type { ReactNode } from "react";

export type AppShellProps = {
	children: ReactNode;
	onSignOut: () => void;
	signingOut: boolean;
};

/** Header with the product name, navigation and sign-out; the page below. */
export function AppShell({ children, onSignOut, signingOut }: AppShellProps) {
	return (
		<div className="flex min-h-dvh flex-col">
			<header className="border-b">
				<div className="mx-auto flex h-12 w-full max-w-5xl items-center gap-6 px-4">
					<Link href="/documents" className="text-sm font-semibold">
						Synapse
					</Link>
					<nav aria-label="Main" className="flex gap-4 text-xs text-muted-foreground">
						<Link href="/documents" className="hover:text-foreground">
							Documents
						</Link>
					</nav>
					<Button
						className="ml-auto"
						variant="ghost"
						size="sm"
						disabled={signingOut}
						onClick={onSignOut}
					>
						{signingOut ? "Signing out…" : "Sign out"}
					</Button>
				</div>
			</header>
			<main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
		</div>
	);
}
