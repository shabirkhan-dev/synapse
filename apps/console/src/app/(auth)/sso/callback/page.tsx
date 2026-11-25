import type { Metadata } from "next";

import { SsoCallbackContainer } from "@/features/auth";

// The URL carries a single-use code: never send it on as a referrer.
export const metadata: Metadata = {
	title: "Signing in · Synapse Console",
	referrer: "no-referrer",
};

const text = (value: string | string[] | undefined) =>
	typeof value === "string" && value ? value.slice(0, 500) : null;

export default async function SsoCallbackPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const params = await searchParams;
	return (
		<SsoCallbackContainer
			code={text(params.code)}
			state={text(params.state)}
			providerError={text(params.error_description) ?? text(params.error)}
		/>
	);
}
