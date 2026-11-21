import { createHmac } from "node:crypto";

import { SynapseError } from "@synapse/core/errors";
import { jwtVerify, SignJWT } from "jose";

import { SECURITY_ERROR_CODES } from "./security-error-codes";

const AUDIENCE = "synapse-mfa";
export const MFA_CHALLENGE_TTL_SECONDS = 300;

export type MfaChallenges = {
	/** A short-lived proof that the password was right, traded for tokens with a second-step code. */
	issue(userId: string, now?: Date): Promise<string>;
	/** The user id; throws `AUTH_MFA_CHALLENGE_INVALID` when forged, expired or not a challenge. */
	verify(challenge: string): Promise<string>;
};

/**
 * Signed with a key derived from the access-token secret (HMAC with a fixed label), so a
 * challenge never verifies as an access token, nor an access token as a challenge.
 */
export function createMfaChallenges(secret: string): MfaChallenges {
	const key = createHmac("sha256", secret).update("synapse/mfa-challenge/v1").digest();
	return {
		async issue(userId, now = new Date()) {
			const issuedAt = Math.floor(now.getTime() / 1000);
			return new SignJWT({})
				.setProtectedHeader({ alg: "HS256", typ: "JWT" })
				.setSubject(userId)
				.setAudience(AUDIENCE)
				.setIssuedAt(issuedAt)
				.setExpirationTime(issuedAt + MFA_CHALLENGE_TTL_SECONDS)
				.sign(key);
		},
		async verify(challenge) {
			try {
				const { payload } = await jwtVerify(challenge, key, {
					algorithms: ["HS256"],
					audience: AUDIENCE,
				});
				if (typeof payload.sub !== "string") throw new Error("Missing sub");
				return payload.sub;
			} catch (cause) {
				throw new SynapseError(SECURITY_ERROR_CODES.MFA_CHALLENGE_INVALID, "Invalid sign-in step", {
					cause,
				});
			}
		},
	};
}
