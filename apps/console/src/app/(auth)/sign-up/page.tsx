import type { Metadata } from "next";

import { SignUpContainer } from "@/features/auth";

export const metadata: Metadata = { title: "Create an account · Synapse Console" };

export default function SignUpPage() {
	return <SignUpContainer />;
}
