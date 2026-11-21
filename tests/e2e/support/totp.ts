import { createHmac } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(text: string): Buffer {
	let bits = 0;
	let value = 0;
	const out: number[] = [];
	for (const char of text.replace(/\s/g, "").toUpperCase()) {
		value = (value << 5) | BASE32.indexOf(char);
		bits += 5;
		if (bits >= 8) {
			out.push((value >>> (bits - 8)) & 255);
			bits -= 8;
		}
	}
	return Buffer.from(out);
}

/** The RFC 6238 code an authenticator app shows for `secret`, `offset` 30-second steps from now. */
export function totpCode(secret: string, offset = 0): string {
	const counter = Math.floor(Date.now() / 30_000) + offset;
	const message = Buffer.alloc(8);
	message.writeBigUInt64BE(BigInt(counter));
	const mac = createHmac("sha1", base32Decode(secret)).update(message).digest();
	const start = (mac[mac.length - 1] ?? 0) & 15;
	return String((mac.readUInt32BE(start) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
