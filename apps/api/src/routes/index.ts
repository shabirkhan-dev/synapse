import type { OpenAPIHono } from "@hono/zod-openapi";

import type { Configuration } from "@/config";
import { type AuthService, createAuthMiddleware, createAuthRoutes } from "@/modules/auth";
import { type ChatService, createChatRoutes } from "@/modules/chat";
import { createHealthRoutes } from "@/modules/health";
import { createRagRoutes, type RagService } from "@/modules/rag";
import type { AppBindings } from "@/shared/types/app-types";

export type RouteDependencies = {
	config: Configuration;
	auth: AuthService;
	rag: RagService;
	chat: ChatService;
	pingDatabase: () => Promise<void>;
};

/** Mount every module router under the versioned base path. Protected modules get auth first. */
export function registerRoutes(
	app: OpenAPIHono<AppBindings>,
	{ config, auth, rag, chat, pingDatabase }: RouteDependencies,
) {
	const { basePath, serviceName } = config.app;
	const authenticate = createAuthMiddleware(auth);

	app.use(`${basePath}/auth/sign-out`, authenticate);
	app.use(`${basePath}/auth/me`, authenticate);
	app.use(`${basePath}/rag/*`, authenticate);
	app.use(`${basePath}/chat`, authenticate);
	app.use(`${basePath}/chat/*`, authenticate);

	app.route(`${basePath}/health`, createHealthRoutes({ serviceName, pingDatabase }));
	app.route(`${basePath}/auth`, createAuthRoutes(auth));
	app.route(`${basePath}/rag`, createRagRoutes(rag));
	app.route(`${basePath}/chat`, createChatRoutes(chat));
}
