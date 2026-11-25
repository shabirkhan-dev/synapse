import { isIP } from "node:net";

import { SynapseError } from "@synapse/core/errors";

import { isPublicAddress } from "./address-policy";

export type ResolveHost = (hostname: string) => Promise<string[]>;

export type PublicRequestOptions = {
	/**
	 * Development and tests only: allow private and loopback addresses and any port. Production
	 * config refuses it.
	 */
	allowPrivateNetworks?: boolean;
	/** Defaults to `Bun.dns.lookup`. */
	resolve?: ResolveHost;
	/** Defaults to the global `fetch`. */
	fetch?: typeof fetch;
	/** Only `https:` (OIDC providers); otherwise http and https. Ignored with private networks. */
	httpsOnly?: boolean;
	/** The codes thrown for a refused or an unreachable address. */
	codes: { notAllowed: string; unreachable: string };
};

const DEFAULT_PORTS: Record<string, string> = { "http:": "80", "https:": "443" };

const defaultResolve: ResolveHost = async (hostname) =>
	(await Bun.dns.lookup(hostname)).map((entry) => entry.address);

/**
 * One HTTP request that cannot reach inside the network (SSRF): only http(s) on the default ports,
 * no credentials in the URL, and every address the host resolves to must be public. The connection
 * then goes to that checked address (the host name kept for `Host` and TLS), so the name cannot be
 * re-resolved to an internal one in between (DNS rebinding). Redirects are not followed: the
 * caller checks each `Location` with another request.
 */
export function createPublicRequest({
	allowPrivateNetworks = false,
	resolve = defaultResolve,
	fetch: fetchImpl = fetch,
	httpsOnly = false,
	codes,
}: PublicRequestOptions) {
	const fail = (code: string, message: string, retryable = false) =>
		new SynapseError(code, message, { retryable });

	async function checkedAddress(url: URL): Promise<string> {
		const schemes = httpsOnly && !allowPrivateNetworks ? ["https:"] : ["http:", "https:"];
		if (!schemes.includes(url.protocol)) {
			throw fail(codes.notAllowed, `Only ${schemes.join(" and ")} addresses are allowed`);
		}
		if (url.username || url.password) {
			throw fail(codes.notAllowed, "Addresses with a user name or password are refused");
		}
		if (!allowPrivateNetworks && url.port && url.port !== DEFAULT_PORTS[url.protocol]) {
			throw fail(codes.notAllowed, "Only the standard web ports (80, 443) are allowed");
		}
		const hostname = url.hostname.replace(/^\[|\]$/g, "");
		let addresses: string[];
		if (isIP(hostname)) {
			addresses = [hostname];
		} else {
			try {
				addresses = await resolve(hostname);
			} catch {
				throw fail(codes.unreachable, `Could not find ${hostname}`, true);
			}
		}
		if (addresses.length === 0) throw fail(codes.unreachable, `Could not find ${hostname}`, true);
		// Every address, not just the first: a host may mix public and internal records.
		if (!allowPrivateNetworks && !addresses.every(isPublicAddress)) {
			throw fail(codes.notAllowed, "That address points inside a private network");
		}
		return addresses[0] as string;
	}

	return async function request(url: URL, init: RequestInit = {}): Promise<Response> {
		const address = await checkedAddress(url);
		const pinned = new URL(url);
		pinned.hostname = isIP(address) === 6 ? `[${address}]` : address;
		const hostname = url.hostname.replace(/^\[|\]$/g, "");
		const headers = new Headers(init.headers);
		headers.set("Host", url.host);
		return fetchImpl(pinned, {
			...init,
			redirect: "manual",
			headers,
			...(url.protocol === "https:" && !isIP(hostname) ? { tls: { serverName: hostname } } : {}),
		} as RequestInit);
	};
}
