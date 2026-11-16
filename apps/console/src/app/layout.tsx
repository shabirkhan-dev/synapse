import "@synapse/ui/globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { TooltipProvider } from "@synapse/ui/components/tooltip";

import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export const metadata: Metadata = {
	title: "Synapse Console",
	description: "Admin and playground for the Synapse AI platform.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		// next-themes sets the theme class on <html> before React hydrates.
		<html lang="en" suppressHydrationWarning>
			<body className="min-h-dvh bg-background text-foreground antialiased">
				<ThemeProvider>
					<QueryProvider>
						<TooltipProvider>{children}</TooltipProvider>
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
