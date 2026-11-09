import { useEffect, useSyncExternalStore } from "react";

import { restoreSession } from "@/lib/api/client";
import { getSessionStatus, type SessionStatus, subscribeSession } from "@/lib/api/session";

/**
 * The tab's session status, restoring it from the cookie on first use. `"unknown"` during server
 * rendering and until the restore answers.
 */
export function useSessionStatus(): SessionStatus {
	const status = useSyncExternalStore(subscribeSession, getSessionStatus, () => "unknown" as const);
	useEffect(() => {
		if (status === "unknown") void restoreSession();
	}, [status]);
	return status;
}
