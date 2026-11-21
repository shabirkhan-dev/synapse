import type { Metadata } from "next";

import { SignInContainer } from "@/features/auth";

export const metadata: Metadata = { title: "Sign in · Synapse Console" };

export default async function SignInPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { invite } = await searchParams;
	return <SignInContainer invite={typeof invite === "string" && invite ? invite : null} />;
}
