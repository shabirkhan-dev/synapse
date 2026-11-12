import type { Metadata } from "next";

import { DocumentContainer } from "@/features/documents";

export const metadata: Metadata = { title: "Document · Synapse Console" };

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <DocumentContainer id={id} />;
}
