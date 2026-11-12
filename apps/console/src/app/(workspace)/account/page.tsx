import type { Metadata } from "next";

import { AccountContainer } from "@/features/account";

export const metadata: Metadata = { title: "Account · Synapse Console" };

export default function AccountPage() {
	return <AccountContainer />;
}
