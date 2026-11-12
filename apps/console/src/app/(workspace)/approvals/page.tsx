import type { Metadata } from "next";

import { ApprovalsContainer } from "@/features/oversight";

export const metadata: Metadata = { title: "Approvals · Synapse Console" };

export default function ApprovalsPage() {
	return <ApprovalsContainer />;
}
