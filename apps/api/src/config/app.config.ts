import type { Env } from "./env";

export type AppConfig = {
	nodeEnv: Env["NODE_ENV"];
	port: number;
	serviceName: string;
	/** e.g. `api` → docs at `/api/docs`. */
	apiPrefix: string;
	/** e.g. `/api/v1`. */
	basePath: string;
	corsOrigins: string[];
};

export function parseCorsOrigins(value: string): string[] {
	return value
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
}

export function createAppConfig(env: Env): AppConfig {
	return {
		nodeEnv: env.NODE_ENV,
		port: env.PORT,
		serviceName: env.SERVICE_NAME,
		apiPrefix: env.API_PREFIX,
		basePath: `/${env.API_PREFIX}/v${env.API_VERSION}`,
		corsOrigins: parseCorsOrigins(env.CORS_ORIGIN),
	};
}
