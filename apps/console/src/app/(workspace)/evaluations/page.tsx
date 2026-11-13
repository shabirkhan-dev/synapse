import type { Metadata } from "next";

import { EvaluationsContainer } from "@/features/evaluations";

export const metadata: Metadata = { title: "Evaluations · Synapse Console" };

export default function EvaluationsPage() {
	return <EvaluationsContainer />;
}
