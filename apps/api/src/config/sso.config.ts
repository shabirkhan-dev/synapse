import type { Env } from "./env";

/** Console page identity providers send people back to (registered with each provider). */
const CALLBACK_PATH = "/sso/callback";

export type SsoConfig = {
	/** `<APP_URL>/sso/callback`. */
	redirectUri: string;
	/** Development and tests only: http and private addresses for providers. */
	allowPrivateNetworks: boolean;
};

export function createSsoConfig(env: Env): SsoConfig {
	return {
		redirectUri: `${env.APP_URL.replace(/\/$/, "")}${CALLBACK_PATH}`,
		allowPrivateNetworks: env.SSO_ALLOW_PRIVATE_NETWORKS === "true",
	};
}
