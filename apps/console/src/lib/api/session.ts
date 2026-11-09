/**
 * The signed-in session as this tab sees it. Only the short-lived access token is kept, in memory:
 * the refresh token lives in an httpOnly cookie the page cannot read (ADR-0007), so a reload
 * starts `unknown` and the client restores the session with a cookie refresh.
 */
export type SessionStatus = "unknown" | "signed-in" | "signed-out";

let accessToken: string | null = null;
let status: SessionStatus = "unknown";
const listeners = new Set<() => void>();

export function getAccessToken(): string | null {
	return accessToken;
}

export function getSessionStatus(): SessionStatus {
	return status;
}

/** A token signs the tab in; `null` signs it out. */
export function setAccessToken(token: string | null): void {
	accessToken = token;
	status = token ? "signed-in" : "signed-out";
	for (const listener of listeners) listener();
}

/** For `useSyncExternalStore`: re-render when the session changes. */
export function subscribeSession(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
