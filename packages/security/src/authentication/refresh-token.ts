const TOKEN_BYTES = 32;

/** A new opaque refresh token (256 random bits, base64url). Only its hash is stored. */
export function createRefreshToken(): string {
	return Buffer.from(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))).toString("base64url");
}

/**
 * SHA-256 hex of a refresh token. A fast hash is enough: the token is random, not a password, and
 * a leaked database row cannot be turned back into a usable token.
 */
export function hashRefreshToken(token: string): string {
	return new Bun.CryptoHasher("sha256").update(token).digest("hex");
}
