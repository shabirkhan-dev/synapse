"use client";

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
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/shared/brand-mark";

import { AccountMenu } from "./account-menu";
import { MAIN_GROUP, NAV, type NavItem } from "./navigation";

export type AppShellProps = {
	children: ReactNode;
	/** The signed-in user's email, once known. */
	email: string | null;
	/** The organization picker, at the top of the sidebar. */
	switcher?: ReactNode;
	/** Search / command palette trigger, at the end of the top bar. */
	search?: ReactNode;
	/** A one-line notice above the page (e.g. verify your email). */
	notice?: ReactNode;
	/** Counts next to sidebar links, by href (e.g. pending approvals). */
	navBadges?: Partial<Record<string, ReactNode>>;
	onSignOut: () => void;
	signingOut: boolean;
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
	notice,
	navBadges,
	onSignOut,
	signingOut,
}: AppShellProps) {
	const pathname = usePathname();
	const current = ALL.find(
		(item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
	);
	const title = current?.label ?? (pathname.startsWith("/account") ? "Account" : "Synapse");
	const section = current ? NAV.find((group) => group.items.includes(current))?.label : undefined;

	return (
		<SidebarProvider>
			<Sidebar variant="inset">
				<SidebarHeader className="gap-3">
					<Link href="/documents" className="w-fit rounded-md px-1 pt-1">
						<BrandMark />
					</Link>
					{switcher}
				</SidebarHeader>
				<SidebarContent>
					<nav aria-label="Main">
						{NAV.map((group) => (
							<SidebarGroup key={group.label}>
								{/* The main group needs no heading (its links say what they are). */}
								{group.label === MAIN_GROUP ? (
									<h2 className="sr-only">{group.label}</h2>
								) : (
									<SidebarGroupLabel className="text-[0.8rem] font-normal">
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
				</SidebarContent>
				<SidebarFooter>
					<AccountFooter
						email={email}
						signingOut={signingOut}
						onSignOut={onSignOut}
						active={pathname.startsWith("/account")}
					/>
				</SidebarFooter>
			</Sidebar>
			{/* A soft accent glow in the corner of the dark panel; the light panel stays plain. */}
			<SidebarInset className="min-w-0 dark:bg-[radial-gradient(ellipse_70%_55%_at_100%_100%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent)]">
				<header className="flex h-14 shrink-0 items-center gap-3 px-4">
					<SidebarTrigger aria-label="Show or hide the sidebar" className="-ms-1" />
					<p className="flex min-w-0 items-center gap-2 text-sm">
						{section && section !== MAIN_GROUP ? (
							<span className="hidden text-muted-foreground sm:inline">{section}</span>
						) : null}
						<span className="inline-flex min-w-0 items-center gap-2 rounded-full border bg-card px-3 py-1.5 font-medium shadow-xs">
							{current ? (
								<HugeiconsIcon
									icon={current.icon}
									size={15}
									strokeWidth={1.75}
									className="shrink-0 text-primary"
									aria-hidden="true"
								/>
							) : null}
							<span className="truncate">{title}</span>
						</span>
					</p>
					{search ? <div className="ms-auto">{search}</div> : null}
				</header>
				{notice ? (
					<div className="mx-4 rounded-xl border bg-muted/60 px-4 py-2.5 md:mx-6">{notice}</div>
				) : null}
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
				className="h-10 gap-3 rounded-lg px-2.5 text-[0.95rem] [&_svg]:size-[18px]! [&_svg]:text-muted-foreground data-active:[&_svg]:text-sidebar-primary"
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
				<SidebarMenuBadge className="top-2.5! rounded-md bg-sidebar-accent text-[0.7rem] text-muted-foreground empty:hidden">
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
