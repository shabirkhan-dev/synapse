import type { ReactNode } from "react";

import { SessionGate } from "@/features/auth";
import { CommandPaletteContainer } from "@/features/command-palette";
import { OrganizationSwitcherContainer } from "@/features/organizations";
import { PendingApprovalsBadge } from "@/features/oversight";
import { RecentContainer } from "@/features/recent";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
	return (
		<SessionGate
			switcher={<OrganizationSwitcherContainer />}
			search={<CommandPaletteContainer />}
			recent={<RecentContainer />}
			navBadges={{ "/approvals": <PendingApprovalsBadge /> }}
		>
			{children}
		</SessionGate>
	);
}
