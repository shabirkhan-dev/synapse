"use client";

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createQueryClient } from "@/lib/query/query-client";

let browserQueryClient: QueryClient | undefined;

/** Isolated per server render; one per tab in the browser (keeps the cache across renders). */
function getQueryClient(): QueryClient {
	if (typeof window === "undefined") return createQueryClient();
	browserQueryClient ??= createQueryClient();
	return browserQueryClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
	return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
