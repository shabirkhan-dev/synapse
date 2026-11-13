import type { Metadata } from "next";

import { AgentsContainer } from "@/features/agents";

export const metadata: Metadata = { title: "Agents · Synapse Console" };

export default function AgentsPage() {
	return <AgentsContainer />;
}
