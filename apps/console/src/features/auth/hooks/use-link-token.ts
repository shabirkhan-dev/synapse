import { useEffect } from "react";

/**
 * Emailed links carry a single-use token in `?token=`. Once the page has read it, drop it from the
 * address bar so it does not linger in history or get copied along with the URL.
 */
export function useLinkToken(token: string | null): void {
	useEffect(() => {
		if (!token) return;
		const url = new URL(window.location.href);
		if (!url.searchParams.has("token")) return;
		url.searchParams.delete("token");
		window.history.replaceState(window.history.state, "", url);
	}, [token]);
}
