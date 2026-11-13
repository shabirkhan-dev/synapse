import type { Metadata } from "next";

import { SystemContainer } from "@/features/system";

export const metadata: Metadata = { title: "System · Synapse Console" };

export default function SystemPage() {
	return <SystemContainer />;
}
