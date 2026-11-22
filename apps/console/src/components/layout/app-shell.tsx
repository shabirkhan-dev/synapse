"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
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
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from "@synapse/ui/components/sidebar";
import { Skeleton } from "@synapse/ui/components/skeleton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/shared/brand-mark";
import { PageSkeleton } from "@/components/shared/page-skeleton";

import { AccountMenu } from "./account-menu";
import { MAIN_GROUP, NAV, type NavItem } from "./navigation";

export type AppShellProps = {
	children: ReactNode;
	/** The signed-in user's email, once known. */
	email: string | null;
	/** The organization picker, at the top of the sidebar. */
	switcher?: ReactNode;
	/** Search / command palette trigger, under the workspace row in the sidebar. */
	search?: ReactNode;
	/** Recent conversations and documents, under the pages. */
	recent?: ReactNode;
	/** A one-line notice above the page (e.g. verify your email). */
	notice?: ReactNode;
	/** Counts next to sidebar links, by href (e.g. pending approvals). */
	navBadges?: Partial<Record<string, ReactNode>>;
	onSignOut: () => void;
	signingOut: boolean;
	/** The session is being restored: the frame shows with placeholders instead of the page. */
	pending?: boolean;
};

const ALL = NAV.flatMap((group) => group.items);

/**
 * The app frame: a sidebar (organization, navigation, you) and the page in an inset panel. On
 * phones the sidebar is a drawer opened from the top bar; Ctrl/⌘+B collapses it on wider screens.
 */
export function AppShell({
	children,
	email,
	switcher,
	search,
	recent,
	notice,
	navBadges,
	onSignOut,
	signingOut,
	pending = false,
}: AppShellProps) {
	const pathname = usePathname();
	const current = ALL.find(
		(item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
	);
	const title = current?.label ?? (pathname.startsWith("/account") ? "Account" : "Synapse");
	const section = current ? NAV.find((group) => group.items.includes(current))?.label : undefined;

	return (
		<SidebarProvider>
			<Sidebar>
				{/* The workspace row (mark, team, collapse), then search: as in the references. */}
				<SidebarHeader className="gap-2 px-3 pt-3">
					<div className="flex items-center gap-1.5">
						<Link
							href="/documents"
							aria-label="Synapse home"
							className="shrink-0 rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"
						>
							<BrandMark compact />
						</Link>
						<div className="min-w-0 flex-1">{switcher}</div>
						<SidebarTrigger
							aria-label="Show or hide the sidebar"
							className="shrink-0 text-muted-foreground max-md:hidden"
						/>
					</div>
					{search}
				</SidebarHeader>
				<SidebarContent className="px-1">
					<nav aria-label="Main">
						{NAV.map((group) => (
							<SidebarGroup key={group.label}>
								{/* The main group needs no heading (its links say what they are). */}
								{group.label === MAIN_GROUP ? (
									<h2 className="sr-only">{group.label}</h2>
								) : (
									<SidebarGroupLabel className="font-mono text-[0.6875rem] font-normal tracking-[0.08em] uppercase">
										{group.label}
									</SidebarGroupLabel>
								)}
								<SidebarGroupContent>
									<SidebarMenu>
										{group.items.map((item) => (
											<NavLink
												key={item.href}
												item={item}
												active={item === current}
												here={pathname === item.href}
												badge={navBadges?.[item.href]}
											/>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						))}
					</nav>
					{recent}
				</SidebarContent>
				<SidebarFooter className="p-3">
					{pending ? (
						<Skeleton className="h-14 rounded-xl" />
					) : (
						<AccountFooter
							email={email}
							signingOut={signingOut}
							onSignOut={onSignOut}
							active={pathname.startsWith("/account")}
						/>
					)}
				</SidebarFooter>
			</Sidebar>
			<SidebarInset className="min-w-0">
				<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-sm md:px-8">
					<TopBarSidebarTrigger />
					{/* Section, muted, then the page; inside a page (one document) the page links back. */}
					<nav aria-label="Breadcrumb" className="min-w-0">
						<ol className="flex min-w-0 items-center gap-2 text-sm">
							<li className="hidden shrink-0 text-muted-foreground sm:block">
								{section ?? "Synapse"}
							</li>
							<li aria-hidden="true" className="hidden text-muted-foreground/60 sm:block">
								<HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.5} />
							</li>
							{current ? (
								<li aria-hidden="true" className="shrink-0 text-muted-foreground">
									<HugeiconsIcon icon={current.icon} size={16} strokeWidth={1.5} />
								</li>
							) : null}
							{current && pathname !== current.href ? (
								<>
									<li className="shrink-0">
										<Link
											href={current.href}
											className="rounded-sm text-muted-foreground hover:text-foreground"
										>
											{title}
										</Link>
									</li>
									<li aria-hidden="true" className="text-muted-foreground/60">
										<HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.5} />
									</li>
									<li className="truncate font-medium" aria-current="page">
										Details
									</li>
								</>
							) : (
								<li className="truncate font-medium" aria-current="page">
									{title}
								</li>
							)}
						</ol>
					</nav>
				</header>
				{notice ? (
					<div className="border-b bg-muted/40 px-4 py-2.5 text-sm md:px-6">{notice}</div>
				) : null}
				<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8 md:py-10">
					{pending ? <PageSkeleton /> : children}
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}

/** A sidebar link; on phones following it also closes the drawer. */
function NavLink({
	item,
	active,
	here,
	badge,
}: {
	item: NavItem;
	/** A count shown at the end of the row (rendered only when it renders something). */
	badge?: ReactNode;
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
				className="h-9 gap-3 rounded-lg px-2.5 text-sm text-sidebar-foreground/90 [&_svg]:size-[18px]! [&_svg]:text-sidebar-foreground/70 data-active:font-medium data-active:text-sidebar-foreground data-active:[&_svg]:text-sidebar-foreground"
				render={
					<Link
						href={item.href}
						aria-current={here ? "page" : active ? "true" : undefined}
						onClick={() => setOpenMobile(false)}
					/>
				}
			>
				<HugeiconsIcon icon={item.icon} strokeWidth={1.75} aria-hidden="true" />
				<span className="truncate">{item.label}</span>
			</SidebarMenuButton>
			{badge ? (
				<SidebarMenuBadge className="top-2.5! rounded-md bg-sidebar-accent font-mono text-[0.6875rem] text-muted-foreground empty:hidden">
					{badge}
				</SidebarMenuBadge>
			) : null}
		</SidebarMenuItem>
	);
}

/** You, at the foot of the sidebar; following a link there also closes the phone drawer. */
function AccountFooter({
	email,
	signingOut,
	onSignOut,
	active,
}: {
	email: string | null;
	signingOut: boolean;
	onSignOut: () => void;
	active: boolean;
}) {
	const { setOpenMobile } = useSidebar();
	return (
		<AccountMenu
			email={email}
			signingOut={signingOut}
			onSignOut={onSignOut}
			onNavigate={() => setOpenMobile(false)}
			active={active}
		/>
	);
}

/** The top bar's sidebar button: on phones (the drawer), or once the sidebar is collapsed. */
function TopBarSidebarTrigger() {
	const { isMobile, state } = useSidebar();
	if (!isMobile && state === "expanded") return null;
	return <SidebarTrigger aria-label="Show or hide the sidebar" className="-ms-1.5" />;
}
