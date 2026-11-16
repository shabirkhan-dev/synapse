"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Light, dark or the system setting, remembered per browser. The class is set on <html> before
 * the page paints, so there is no flash of the wrong theme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			{children}
		</NextThemesProvider>
	);
}
