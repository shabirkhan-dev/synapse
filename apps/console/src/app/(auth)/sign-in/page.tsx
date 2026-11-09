import type { Metadata } from "next";

import { SignInContainer } from "@/features/auth";

export const metadata: Metadata = { title: "Sign in · Synapse Console" };

export default function SignInPage() {
	return (
		<main className="flex min-h-dvh items-center justify-center px-4">
			<SignInContainer />
		</main>
	);
}
