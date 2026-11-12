import type { ReactNode } from "react";

import { SessionGate } from "@/features/auth";
import { OrganizationSwitcherContainer } from "@/features/organizations";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
	return <SessionGate switcher={<OrganizationSwitcherContainer />}>{children}</SessionGate>;
}
