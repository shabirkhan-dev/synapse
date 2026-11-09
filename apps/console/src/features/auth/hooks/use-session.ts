import { useSyncExternalStore } from "react";

import { getSession, subscribeSession } from "@/lib/api/session";

/**
 * `"signed-in"` / `"signed-out"` in the browser; `"unknown"` during server rendering, where
 * `sessionStorage` does not exist (so the first client render matches the server HTML).
 */
export function useSessionStatus(): "signed-in" | "signed-out" | "unknown" {
	return useSyncExternalStore(
		subscribeSession,
		() => (getSession() ? "signed-in" : "signed-out"),
		() => "unknown",
	);
}
