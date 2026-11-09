import "@synapse/ui/globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
	title: "Synapse Console",
	description: "Admin and playground for the Synapse AI platform.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body className="min-h-dvh bg-background text-foreground antialiased">
				<QueryProvider>{children}</QueryProvider>
			</body>
		</html>
	);
}
