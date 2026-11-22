import type { Metadata } from "next";

import { DocumentsContainer } from "@/features/documents";
import { GettingStartedContainer } from "@/features/onboarding";

export const metadata: Metadata = { title: "Documents · Synapse Console" };

export default function DocumentsPage() {
	return <DocumentsContainer intro={<GettingStartedContainer />} />;
}
