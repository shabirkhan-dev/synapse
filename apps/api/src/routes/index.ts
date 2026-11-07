import type { OpenAPIHono } from "@hono/zod-openapi";

import type { Configuration } from "@/config";
import { createAuthMiddleware } from "@/modules/auth";
import { type ChatService, createChatRoutes } from "@/modules/chat";
import { createHealthRoutes } from "@/modules/health";
import { createRagRoutes, type RagService } from "@/modules/rag";
import type { AppBindings } from "@/shared/types/app-types";

export type RouteDependencies = {
	config: Configuration;
	rag: RagService;
	chat: ChatService;
	pingDatabase: () => Promise<void>;
};

/** Mount every module router under the versioned base path. Protected modules get auth first. */
export function registerRoutes(
	app: OpenAPIHono<AppBindings>,
	{ config, rag, chat, pingDatabase }: RouteDependencies,
) {
	const { basePath, serviceName } = config.app;
	const auth = createAuthMiddleware(config.auth);

	app.use(`${basePath}/rag/*`, auth);
	app.use(`${basePath}/chat`, auth);
	app.use(`${basePath}/chat/*`, auth);

	app.route(`${basePath}/health`, createHealthRoutes({ serviceName, pingDatabase }));
	app.route(`${basePath}/rag`, createRagRoutes(rag));
	app.route(`${basePath}/chat`, createChatRoutes(chat));
}
