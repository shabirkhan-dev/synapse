import type { Metadata } from "next";
import { Suspense } from "react";

import { PlaygroundContainer } from "@/features/playground";

export const metadata: Metadata = { title: "Playground · Synapse Console" };

/** The Playground reads a chosen document from the address, which needs a Suspense boundary. */
export default function PlaygroundPage() {
	return (
		<Suspense fallback={null}>
			<PlaygroundContainer />
		</Suspense>
	);
}
