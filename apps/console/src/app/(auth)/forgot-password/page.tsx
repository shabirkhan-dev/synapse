import type { Metadata } from "next";

import { ForgotPasswordContainer } from "@/features/auth";

export const metadata: Metadata = { title: "Reset your password · Synapse Console" };

export default function ForgotPasswordPage() {
	return <ForgotPasswordContainer />;
}
