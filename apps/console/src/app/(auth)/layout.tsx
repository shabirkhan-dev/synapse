import type { ReactNode } from "react";

import { BrandMark } from "@/components/shared/brand-mark";

/** Signed-out pages: the mark and one centred card on the plain background. */
export default function AuthLayout({ children }: { children: ReactNode }) {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
			<BrandMark />
			{children}
		</main>
	);
}
