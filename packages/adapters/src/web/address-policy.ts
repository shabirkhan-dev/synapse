import { BlockList, isIP } from "node:net";

/**
 * Addresses a server-side fetch must never reach: loopback, private, link-local (cloud metadata
 * lives at 169.254.169.254), carrier-grade NAT, documentation, multicast, reserved, and IPv6 ranges
 * that tunnel to IPv4 (NAT64, 6to4, Teredo). IPv4-mapped IPv6 (`::ffff:10.0.0.1`) is matched by
 * its IPv4 rule.
 */
const BLOCKED = new BlockList();
for (const [network, prefix] of [
	["0.0.0.0", 8],
	["10.0.0.0", 8],
	["100.64.0.0", 10],
	["127.0.0.0", 8],
	["169.254.0.0", 16],
	["172.16.0.0", 12],
	["192.0.0.0", 24],
	["192.0.2.0", 24],
	["192.88.99.0", 24],
	["192.168.0.0", 16],
	["198.18.0.0", 15],
	["198.51.100.0", 24],
	["203.0.113.0", 24],
	["224.0.0.0", 4],
	["240.0.0.0", 4],
] as const) {
	BLOCKED.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
	["::", 128],
	["::1", 128],
	["64:ff9b::", 96],
	["64:ff9b:1::", 48],
	["100::", 64],
	["2001::", 23],
	["2001:db8::", 32],
	["2002::", 16],
	["fc00::", 7],
	["fe80::", 10],
	["fec0::", 10],
	["ff00::", 8],
] as const) {
	BLOCKED.addSubnet(network, prefix, "ipv6");
}

/** True only for a literal IP address on the public internet. */
export function isPublicAddress(address: string): boolean {
	const family = isIP(address);
	if (family === 0) return false;
	return !BLOCKED.check(address, family === 4 ? "ipv4" : "ipv6");
}
