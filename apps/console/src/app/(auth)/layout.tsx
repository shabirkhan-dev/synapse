import type { ReactNode } from "react";

import { BrandMark } from "@/components/shared/brand-mark";

/** Signed-out pages: the mark and one centred card on a soft accent wash. */
export default function AuthLayout({ children }: { children: ReactNode }) {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)] px-4 py-10">
			<BrandMark />
			{children}
		</main>
	);
}
