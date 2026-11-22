"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@synapse/ui/components/sidebar";
import Link from "next/link";

export type RecentLink = { href: string; label: string; tag: string; icon: IconSvgElement };

/**
 * The latest conversations and documents in the sidebar, each with a mono tag on the right (the
 * references' "Favorites"). Its own landmark, so the main navigation stays the pages.
 */
export function RecentLinks({ links }: { links: RecentLink[] }) {
	const { setOpenMobile } = useSidebar();
	if (links.length === 0) return null;
	return (
		<nav aria-label="Recent">
			<SidebarGroup>
				<SidebarGroupLabel className="font-mono text-[0.6875rem] font-normal tracking-[0.08em] uppercase">
					Recent
				</SidebarGroupLabel>
				<SidebarGroupContent>
					<SidebarMenu>
						{links.map((link) => (
							<SidebarMenuItem key={link.href}>
								<SidebarMenuButton
									className="h-9 gap-3 rounded-lg px-2.5 text-sm text-sidebar-foreground/90 [&_svg]:size-[18px]! [&_svg]:text-sidebar-foreground/70"
									render={<Link href={link.href} onClick={() => setOpenMobile(false)} />}
								>
									<HugeiconsIcon icon={link.icon} strokeWidth={1.75} aria-hidden="true" />
									<span className="min-w-0 flex-1 truncate">{link.label}</span>
									<span className="shrink-0 font-mono text-[0.6875rem] tracking-[0.06em] text-muted-foreground uppercase">
										{link.tag}
									</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroupContent>
			</SidebarGroup>
		</nav>
	);
}
