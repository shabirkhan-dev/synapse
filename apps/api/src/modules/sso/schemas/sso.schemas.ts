import { z } from "@hono/zod-openapi";

import { sessionTransport } from "@/modules/auth";

import { SSO_LIMITS, SSO_MESSAGES } from "../constants/sso.constants";

/** A DNS name with at least one dot, e.g. `example.com` (no scheme, no path, no wildcard). */
const domain = z
	.string()
	.trim()
	.toLowerCase()
	.max(253)
	.regex(/^(?=.{1,253}\.?$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\.?$/, {
		message: SSO_MESSAGES.DOMAIN_INVALID,
	})
	.openapi({ example: "example.com" });

export const saveConnectionBodySchema = z
	.object({
		/** The provider's issuer URL; `/.well-known/openid-configuration` is read from it. */
		issuer: z
			.url({ protocol: /^https?$/ })
			.max(512)
			.openapi({ example: "https://login.example.com" }),
		clientId: z.string().trim().min(1).max(512),
		/** Omit (or leave empty) to keep the stored secret. */
		clientSecret: z.string().max(1024).optional(),
		defaultRole: z.enum(["member", "admin"]).default("member"),
		domains: z.array(domain).min(1).max(SSO_LIMITS.MAX_DOMAINS),
	})
	.openapi("SsoConnectionBody");

const domainStatusSchema = z.object({
	domain: z.string(),
	/** When the DNS record was found; `null` until then (sign-ins are not routed to it). */
	verifiedAt: z.string().nullable(),
});

export const connectionSchema = z
	.object({
		issuer: z.string(),
		clientId: z.string(),
		hasClientSecret: z.boolean(),
		defaultRole: z.enum(["owner", "admin", "member"]),
		/** Register this as the redirect (callback) URL with the provider. */
		redirectUri: z.string(),
		/** Add `<name>.<domain>` TXT `<value>` for each domain, then check. */
		dnsRecord: z.object({ name: z.string(), value: z.string() }),
		domains: z.array(domainStatusSchema),
		updatedAt: z.string(),
	})
	.openapi("SsoConnection");

export const connectionOrNullSchema = connectionSchema.nullable();

export const startBodySchema = z
	.object({ email: z.string().trim().pipe(z.email().max(254)) })
	.openapi("SsoStartBody");

export const startResultSchema = z.object({ authorizationUrl: z.string() }).openapi("SsoStart");

export const callbackBodySchema = z
	.object({
		code: z.string().min(1).max(4096),
		state: z.string().min(1).max(512),
		session: sessionTransport,
	})
	.openapi("SsoCallbackBody");
