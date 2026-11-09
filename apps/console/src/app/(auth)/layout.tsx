import type { ReactNode } from "react";

/** Signed-out pages: one centred card. */
export default function AuthLayout({ children }: { children: ReactNode }) {
	return <main className="flex min-h-dvh items-center justify-center px-4 py-10">{children}</main>;
}
