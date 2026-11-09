/**
 * The signed-in session's tokens: in memory, mirrored to `sessionStorage` so a reload in the same
 * tab stays signed in (closing the tab signs out). Readable by page scripts — the trade-off of a
 * browser-only client; a same-origin BFF with httpOnly cookies replaces this later (syn-037).
 */
export type SessionTokens = { accessToken: string; refreshToken: string };

const STORAGE_KEY = "synapse.session";
let current: SessionTokens | null | undefined;
const listeners = new Set<() => void>();

function storage(): Storage | null {
	try {
		return typeof window === "undefined" ? null : window.sessionStorage;
	} catch {
		// Storage can be blocked (privacy settings); the session then lives in memory only.
		return null;
	}
}

export function getSession(): SessionTokens | null {
	if (current === undefined) current = readStored();
	return current;
}

function readStored(): SessionTokens | null {
	const raw = storage()?.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<SessionTokens>;
		return typeof parsed.accessToken === "string" && typeof parsed.refreshToken === "string"
			? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }
			: null;
	} catch {
		// A corrupted entry is treated as signed out.
		return null;
	}
}

export function setSession(tokens: SessionTokens | null): void {
	current = tokens;
	const store = storage();
	if (tokens) store?.setItem(STORAGE_KEY, JSON.stringify(tokens));
	else store?.removeItem(STORAGE_KEY);
	for (const listener of listeners) listener();
}

/** For `useSyncExternalStore`: re-render when the session changes. */
export function subscribeSession(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
