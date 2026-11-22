"use client";

import {
	ComputerIcon,
	Logout01Icon,
	Moon02Icon,
	Settings02Icon,
	Sun01Icon,
	UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@synapse/ui/components/dropdown-menu";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";

const THEMES = [
	{ value: "light", label: "Light", icon: Sun01Icon },
	{ value: "dark", label: "Dark", icon: Moon02Icon },
	{ value: "system", label: "System", icon: ComputerIcon },
] as const;

export type AccountMenuProps = {
	email: string | null;
	onSignOut: () => void;
	signingOut: boolean;
	/** Closes the phone drawer after following a link. */
	onNavigate: () => void;
	/** On the account page: its settings link is the current page. */
	active?: boolean;
};

/** You, at the foot of the sidebar: the account menu (theme, sign out) and a settings shortcut. */
export function AccountMenu({
	email,
	onSignOut,
	signingOut,
	onNavigate,
	active = false,
}: AccountMenuProps) {
	const { theme, setTheme } = useTheme();
	// The stored theme is only known in the browser.
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const name = email?.split("@")[0] ?? "Account";

	return (
		// A bordered card: you (name and address) and a way to settings, as in the references.
		<div className="flex items-center gap-1 rounded-xl border bg-card p-1.5 shadow-card">
			<DropdownMenu>
				<DropdownMenuTrigger
					aria-label="Account menu"
					className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-start outline-hidden transition-colors duration-150 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring data-popup-open:bg-sidebar-accent"
				>
					<span
						aria-hidden="true"
						className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sm font-semibold text-sidebar-foreground uppercase"
					>
						{email?.slice(0, 1) ?? "?"}
					</span>
					<span className="flex min-w-0 flex-col leading-tight">
						<span className="truncate text-sm font-medium" title={email ?? undefined}>
							{name}
						</span>
						<span className="truncate text-xs text-muted-foreground">{email ?? ""}</span>
					</span>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="top" align="start" className="w-60">
					{/* Who is signed in: the address as written (not a mono group label). */}
					<p className="truncate px-2 pt-1.5 pb-1 text-xs text-muted-foreground">
						{email ?? "Signed in"}
					</p>
					<DropdownMenuSeparator />
					<DropdownMenuItem render={<Link href="/account" onClick={onNavigate} />}>
						<HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.75} aria-hidden="true" />
						Account and devices
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuLabel>Theme</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							aria-label="Theme"
							value={mounted ? (theme ?? "system") : ""}
							onValueChange={(value) => setTheme(String(value))}
						>
							{THEMES.map((option) => (
								<DropdownMenuRadioItem key={option.value} value={option.value}>
									<HugeiconsIcon icon={option.icon} strokeWidth={1.75} aria-hidden="true" />
									{option.label}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuItem disabled={signingOut} onClick={onSignOut}>
						<HugeiconsIcon icon={Logout01Icon} strokeWidth={1.75} aria-hidden="true" />
						{signingOut ? "Signing out…" : "Sign out"}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<Link
				href="/account"
				aria-label="Account settings"
				aria-current={active ? "page" : undefined}
				onClick={onNavigate}
				className={`flex size-8 shrink-0 items-center justify-center rounded-lg outline-hidden hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring ${active ? "bg-sidebar-accent text-sidebar-foreground" : "text-muted-foreground"}`}
			>
				<HugeiconsIcon icon={Settings02Icon} size={17} strokeWidth={1.75} aria-hidden="true" />
			</Link>
		</div>
	);
}
