import { Button } from "@synapse/ui/components/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type AppShellProps = {
	children: ReactNode;
	/** The signed-in user's email, once known. */
	email: string | null;
	/** The organization picker, next to the product name. */
	switcher?: ReactNode;
	onSignOut: () => void;
	signingOut: boolean;
};

/** Header with the product name, navigation and sign-out; the page below. */
const NAV = [
	{ href: "/documents", label: "Documents" },
	{ href: "/chat", label: "Chat" },
	{ href: "/playground", label: "Playground" },
	{ href: "/approvals", label: "Approvals" },
	{ href: "/activity", label: "Activity" },
	{ href: "/team", label: "Team" },
] as const;

export function AppShell({ children, email, switcher, onSignOut, signingOut }: AppShellProps) {
	const pathname = usePathname();
	return (
		<div className="flex min-h-dvh flex-col">
			<header className="border-b">
				{/* On phones the nav takes its own row and wraps, so no link hides past the edge. */}
				<div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:h-12 sm:py-0">
					<Link href="/documents" className="text-sm font-semibold">
						Synapse
					</Link>
					{switcher}
					<nav
						aria-label="Main"
						className="order-last flex w-full flex-wrap gap-x-4 gap-y-1 pb-1 text-xs text-muted-foreground sm:order-none sm:w-auto sm:pb-0"
					>
						{NAV.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								aria-current={pathname === item.href ? "page" : undefined}
								className="hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
							>
								{item.label}
							</Link>
						))}
					</nav>
					<div className="ml-auto flex min-w-0 items-center gap-3">
						{email ? (
							<span className="hidden truncate text-xs text-muted-foreground sm:inline">
								{email}
							</span>
						) : null}
						<Button variant="ghost" size="sm" disabled={signingOut} onClick={onSignOut}>
							{signingOut ? "Signing out…" : "Sign out"}
						</Button>
					</div>
				</div>
			</header>
			<main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
		</div>
	);
}
