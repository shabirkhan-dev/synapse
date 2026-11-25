import type { Metadata } from "next";

import { SsoContainer } from "@/features/auth";

export const metadata: Metadata = { title: "Single sign-on · Synapse Console" };

export default function SsoPage() {
	return <SsoContainer />;
}
