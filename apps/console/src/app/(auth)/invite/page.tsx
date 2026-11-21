import type { Metadata } from "next";

import { AcceptInvitationContainer } from "@/features/organizations";

// The URL carries a single-use token: never send it on as a referrer.
export const metadata: Metadata = {
	title: "Join a team · Synapse Console",
	referrer: "no-referrer",
};

export default async function InvitePage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { token } = await searchParams;
	return <AcceptInvitationContainer token={typeof token === "string" && token ? token : null} />;
}
