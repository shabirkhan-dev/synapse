import type { Metadata } from "next";

import { RetrievalContainer } from "@/features/retrieval";

export const metadata: Metadata = { title: "Retrieval · Synapse Console" };

export default function RetrievalPage() {
	return <RetrievalContainer />;
}
