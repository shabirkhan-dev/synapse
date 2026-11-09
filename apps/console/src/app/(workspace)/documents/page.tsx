import type { Metadata } from "next";

import { DocumentsContainer } from "@/features/documents";

export const metadata: Metadata = { title: "Documents · Synapse Console" };

export default function DocumentsPage() {
	return <DocumentsContainer />;
}
