import type { Metadata } from "next";

import { SignUpContainer } from "@/features/auth";

export const metadata: Metadata = { title: "Create an account · Synapse Console" };

export default async function SignUpPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { invite } = await searchParams;
	return <SignUpContainer invite={typeof invite === "string" && invite ? invite : null} />;
}
