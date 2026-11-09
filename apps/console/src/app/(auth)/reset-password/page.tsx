import type { Metadata } from "next";

import { ResetPasswordContainer } from "@/features/auth";

// The URL carries a single-use token: never send it on as a referrer.
export const metadata: Metadata = {
	title: "Choose a new password · Synapse Console",
	referrer: "no-referrer",
};

export default async function ResetPasswordPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { token } = await searchParams;
	return <ResetPasswordContainer token={typeof token === "string" && token ? token : null} />;
}
