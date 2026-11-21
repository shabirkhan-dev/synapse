import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

/**
 * AES-256-GCM for small secrets kept at rest (TOTP secrets). `key` is 32 bytes. The output is
 * `v1.<iv>.<tag>.<ciphertext>` in base64url; tampering or a wrong key fails to open.
 */
export function sealSecret(plain: string, key: Uint8Array): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return [VERSION, iv, tag, body]
		.map((part) => (typeof part === "string" ? part : part.toString("base64url")))
		.join(".");
}

export function openSecret(sealed: string, key: Uint8Array): string {
	const [version, iv, tag, body] = sealed.split(".");
	if (version !== VERSION || !iv || !tag || !body) throw new Error("Unreadable sealed secret");
	const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
	decipher.setAuthTag(Buffer.from(tag, "base64url"));
	return Buffer.concat([
		decipher.update(Buffer.from(body, "base64url")),
		decipher.final(),
	]).toString("utf8");
}
