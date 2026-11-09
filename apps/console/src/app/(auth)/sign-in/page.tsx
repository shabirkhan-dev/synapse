import type { Metadata } from "next";

import { SignInContainer } from "@/features/auth";

export const metadata: Metadata = { title: "Sign in · Synapse Console" };

export default function SignInPage() {
	return <SignInContainer />;
}
