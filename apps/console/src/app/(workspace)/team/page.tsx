import type { Metadata } from "next";

import { TeamContainer } from "@/features/organizations";

export const metadata: Metadata = { title: "Team · Synapse Console" };

export default function TeamPage() {
	return <TeamContainer />;
}
