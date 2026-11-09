import { SynapseError } from "@synapse/core/errors";
import { jwtVerify, SignJWT } from "jose";

import { SECURITY_ERROR_CODES } from "./security-error-codes";

const ALGORITHM = "HS256";

/**
 * Who the access token belongs to: the user (`sub`), the session that issued it (`sid`) and the
 * active organization (`org`). Tokens without `org` act in the user's personal organization.
 */
export type AccessTokenClaims = { sub: string; sid: string; org?: string };

export type AccessTokenOptions = {
	/** HS256 secret (32+ characters). */
	secret: string;
	/** Lifetime in seconds. Short, because access tokens are not checked against the session. */
	ttlSeconds: number;
};

export type IssuedAccessToken = { token: string; expiresAt: Date };

export type AccessTokens = {
	issue(claims: AccessTokenClaims, now?: Date): Promise<IssuedAccessToken>;
	/** Signature, algorithm and expiry; throws `AUTH_ACCESS_TOKEN_INVALID` otherwise. */
	verify(token: string): Promise<AccessTokenClaims>;
};

export function createAccessTokens({ secret, ttlSeconds }: AccessTokenOptions): AccessTokens {
	const key = new TextEncoder().encode(secret);

	return {
		async issue({ sub, sid, org }, now = new Date()) {
			const issuedAt = Math.floor(now.getTime() / 1000);
			const expiresAt = new Date((issuedAt + ttlSeconds) * 1000);
			const token = await new SignJWT(org ? { sid, org } : { sid })
				.setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
				.setSubject(sub)
				.setIssuedAt(issuedAt)
				.setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
				.sign(key);
			return { token, expiresAt };
		},

		async verify(token) {
			try {
				const { payload } = await jwtVerify(token, key, { algorithms: [ALGORITHM] });
				if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
					throw new Error("Missing sub or sid claim");
				}
				if (payload.org !== undefined && typeof payload.org !== "string") {
					throw new Error("Invalid org claim");
				}
				return {
					sub: payload.sub,
					sid: payload.sid,
					...(payload.org ? { org: payload.org } : {}),
				};
			} catch (cause) {
				throw new SynapseError(SECURITY_ERROR_CODES.ACCESS_TOKEN_INVALID, "Invalid access token", {
					cause,
				});
			}
		},
	};
}
