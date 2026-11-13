"use client";

import {
	Activity01Icon,
	AiSearchIcon,
	Analytics01Icon,
	BubbleChatIcon,
	ChartEvaluationIcon,
	CheckmarkCircle02Icon,
	Files01Icon,
	Logout01Icon,
	Robot01Icon,
	TestTube01Icon,
	UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from "@synapse/ui/components/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type AppShellProps = {
	children: ReactNode;
	/** The signed-in user's email, once known. */
	email: string | null;
	/** The organization picker, at the top of the sidebar. */
	switcher?: ReactNode;
	/** A one-line notice above the page (e.g. verify your email). */
	notice?: ReactNode;
	onSignOut: () => void;
	signingOut: boolean;
};

type NavItem = { href: string; label: string; icon: typeof Files01Icon };

const NAV: ReadonlyArray<{ label: string; items: ReadonlyArray<NavItem> }> = [
	{
		label: "Workspace",
		items: [
			{ href: "/documents", label: "Documents", icon: Files01Icon },
			{ href: "/chat", label: "Chat", icon: BubbleChatIcon },
			{ href: "/playground", label: "Playground", icon: TestTube01Icon },
			{ href: "/retrieval", label: "Retrieval", icon: AiSearchIcon },
			{ href: "/evaluations", label: "Evaluations", icon: ChartEvaluationIcon },
			{ href: "/agents", label: "Agents", icon: Robot01Icon },
		],
	},
	{
		label: "Oversight",
		items: [
			{ href: "/approvals", label: "Approvals", icon: CheckmarkCircle02Icon },
			{ href: "/activity", label: "Activity", icon: Activity01Icon },
			{ href: "/usage", label: "Usage", icon: Analytics01Icon },
		],
	},
	{ label: "Organization", items: [{ href: "/team", label: "Team", icon: UserGroupIcon }] },
];

const ALL = NAV.flatMap((group) => group.items);

/**
 * The app frame: a sidebar (organization, navigation, you) and the page in an inset panel. On
 * phones the sidebar is a drawer opened from the top bar; Ctrl/⌘+B collapses it on wider screens.
 */
export function AppShell({
	children,
	email,
	switcher,
	notice,
	onSignOut,
	signingOut,
}: AppShellProps) {
	const pathname = usePathname();
	const current = ALL.find(
		(item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
	);
	const title = current?.label ?? (pathname.startsWith("/account") ? "Account" : "Synapse");

	return (
		<SidebarProvider>
			<Sidebar variant="inset">
				<SidebarHeader className="gap-3">
					<Link href="/documents" className="px-2 pt-1 text-sm font-semibold">
						Synapse
					</Link>
					{switcher}
				</SidebarHeader>
				<SidebarContent>
					<nav aria-label="Main">
						{NAV.map((group) => (
							<SidebarGroup key={group.label}>
								<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{group.items.map((item) => (
											<NavLink
												key={item.href}
												item={item}
												active={item === current}
												here={pathname === item.href}
											/>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						))}
					</nav>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						<AccountLink email={email} active={pathname.startsWith("/account")} />
						<SidebarMenuItem>
							<SidebarMenuButton disabled={signingOut} onClick={onSignOut}>
								<HugeiconsIcon icon={Logout01Icon} strokeWidth={1.5} aria-hidden="true" />
								<span>{signingOut ? "Signing out…" : "Sign out"}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset className="min-w-0">
				<header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger aria-label="Show or hide the sidebar" className="-ms-1" />
					<p className="truncate text-sm font-medium">{title}</p>
				</header>
				{notice ? <div className="border-b bg-muted px-4 py-2 md:px-6">{notice}</div> : null}
				<main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}

/** A sidebar link; on phones following it also closes the drawer. */
function NavLink({
	item,
	active,
	here,
}: {
	item: NavItem;
	/** This section (also on its sub-pages, e.g. one document). */
	active: boolean;
	/** Exactly this page. */
	here: boolean;
}) {
	const { setOpenMobile } = useSidebar();
	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				isActive={active}
				render={
					<Link
						href={item.href}
						aria-current={here ? "page" : active ? "true" : undefined}
						onClick={() => setOpenMobile(false)}
					/>
				}
			>
				<HugeiconsIcon icon={item.icon} strokeWidth={1.5} aria-hidden="true" />
				<span className="truncate">{item.label}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}

/** You: your initial, "Account" and your email; opens the account page. */
function AccountLink({ email, active }: { email: string | null; active: boolean }) {
	const { setOpenMobile } = useSidebar();
	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				size="lg"
				isActive={active}
				render={
					<Link
						href="/account"
						aria-current={active ? "page" : undefined}
						onClick={() => setOpenMobile(false)}
					/>
				}
			>
				<span
					aria-hidden="true"
					className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground uppercase"
				>
					{email?.slice(0, 1) ?? "?"}
				</span>
				<span className="flex min-w-0 flex-col">
					<span className="font-medium">Account</span>
					{email ? (
						<span className="truncate text-xs text-sidebar-foreground/80" title={email}>
							{email}
						</span>
					) : null}
				</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}
