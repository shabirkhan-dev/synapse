import type { Metadata } from "next";

import { PlaygroundContainer } from "@/features/playground";

export const metadata: Metadata = { title: "Playground · Synapse Console" };

export default function PlaygroundPage() {
	return <PlaygroundContainer />;
}
