import { createHmac, timingSafeEqual } from "node:crypto";

/** Base32 (RFC 4648, no padding): how authenticator apps take a shared secret. */
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const TOTP = { STEP_SECONDS: 30, DIGITS: 6, SECRET_BYTES: 20, WINDOW: 1 } as const;

export function base32Encode(bytes: Uint8Array): string {
	let bits = 0;
	let value = 0;
	let out = "";
	for (const byte of bytes) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			out += BASE32[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
	return out;
}

export function base32Decode(text: string): Uint8Array {
	const clean = text.replace(/[\s=-]/g, "").toUpperCase();
	let bits = 0;
	let value = 0;
	const out: number[] = [];
	for (const char of clean) {
		const index = BASE32.indexOf(char);
		if (index < 0) throw new Error("Not a base32 secret");
		value = (value << 5) | index;
		bits += 5;
		if (bits >= 8) {
			out.push((value >>> (bits - 8)) & 255);
			bits -= 8;
		}
	}
	return Uint8Array.from(out);
}

/** A new shared secret (160 random bits, base32), as RFC 4226 recommends for HMAC-SHA1. */
export function createTotpSecret(): string {
	return base32Encode(crypto.getRandomValues(new Uint8Array(TOTP.SECRET_BYTES)));
}

/** The RFC 4226 HOTP value for one counter (HMAC-SHA1, dynamic truncation). */
export function hotp(secret: Uint8Array, counter: number, digits: number = TOTP.DIGITS): string {
	const message = Buffer.alloc(8);
	message.writeBigUInt64BE(BigInt(counter));
	const mac = createHmac("sha1", secret).update(message).digest();
	const offset = (mac[mac.length - 1] ?? 0) & 15;
	const binary = mac.readUInt32BE(offset) & 0x7fffffff;
	return String(binary % 10 ** digits).padStart(digits, "0");
}

/** The RFC 6238 counter (30-second steps since the Unix epoch) for a time. */
export const totpCounter = (at: Date): number =>
	Math.floor(at.getTime() / 1000 / TOTP.STEP_SECONDS);

/**
 * Check a 6-digit code against the secret, one step either side for clock drift. Returns the
 * counter it matched, so callers can refuse it next time (a code works once), or `null`.
 */
export function verifyTotp(
	secret: string,
	code: string,
	at: Date,
	{ after = -1 }: { after?: number } = {},
): number | null {
	const digits = code.replace(/\s/g, "");
	if (!/^\d{6}$/.test(digits)) return null;
	const key = base32Decode(secret);
	const now = totpCounter(at);
	for (let counter = now - TOTP.WINDOW; counter <= now + TOTP.WINDOW; counter += 1) {
		if (counter <= after) continue;
		const expected = Buffer.from(hotp(key, counter));
		if (timingSafeEqual(expected, Buffer.from(digits))) return counter;
	}
	return null;
}

/** The `otpauth://` link an authenticator app scans (as a QR code) or opens. */
export function totpUri({
	issuer,
	account,
	secret,
}: {
	issuer: string;
	account: string;
	secret: string;
}): string {
	const label = encodeURIComponent(`${issuer}:${account}`);
	const params = new URLSearchParams({
		secret,
		issuer,
		algorithm: "SHA1",
		digits: String(TOTP.DIGITS),
		period: String(TOTP.STEP_SECONDS),
	});
	return `otpauth://totp/${label}?${params.toString()}`;
}

/** Ten one-time recovery codes (`xxxxx-xxxxx`, about 50 bits each), for a lost phone. */
export function createRecoveryCodes(count = 10): string[] {
	const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
	return Array.from({ length: count }, () => {
		const bytes = crypto.getRandomValues(new Uint8Array(10));
		const chars = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
		return `${chars.slice(0, 5)}-${chars.slice(5)}`;
	});
}

/** Recovery codes are compared lowercased, without spaces or dashes. */
export const normalizeRecoveryCode = (code: string): string =>
	code.toLowerCase().replace(/[\s-]/g, "");
