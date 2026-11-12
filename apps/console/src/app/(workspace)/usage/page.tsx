import type { Metadata } from "next";

import { UsageContainer } from "@/features/usage";

export const metadata: Metadata = { title: "Usage · Synapse Console" };

export default function UsagePage() {
	return <UsageContainer />;
}
