import "@synapse/ui/globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { TooltipProvider } from "@synapse/ui/components/tooltip";

import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
	title: "Synapse Console",
	description: "Admin and playground for the Synapse AI platform.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body className="min-h-dvh bg-background text-foreground antialiased">
				<QueryProvider>
					<TooltipProvider>{children}</TooltipProvider>
				</QueryProvider>
			</body>
		</html>
	);
}
