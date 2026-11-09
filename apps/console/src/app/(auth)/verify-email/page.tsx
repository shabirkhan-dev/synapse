import type { Metadata } from "next";

import { VerifyEmailContainer } from "@/features/auth";

// The URL carries a single-use token: never send it on as a referrer.
export const metadata: Metadata = {
	title: "Verify your email · Synapse Console",
	referrer: "no-referrer",
};

export default async function VerifyEmailPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { token } = await searchParams;
	return <VerifyEmailContainer token={typeof token === "string" && token ? token : null} />;
}
