import type { ReactNode } from "react";

import { SessionGate } from "@/features/auth";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
	return <SessionGate>{children}</SessionGate>;
}
