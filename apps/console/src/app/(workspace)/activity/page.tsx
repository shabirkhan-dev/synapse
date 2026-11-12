import type { Metadata } from "next";

import { ActivityContainer } from "@/features/activity";

export const metadata: Metadata = { title: "Activity · Synapse Console" };

export default function ActivityPage() {
	return <ActivityContainer />;
}
