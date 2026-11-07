import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import type { Logger } from "@starter/logger";
import type { LanguageModel } from "ai";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import { errorBody } from "@/common/api-response";
import type { AppBindings } from "@/common/app-types";
import { createErrorHandler, notFoundHandler } from "@/common/error-handler";
import { requestId } from "@/common/request-id";
import { type Env, parseCorsOrigins } from "@/config/env";
import { createAuthMiddleware } from "@/modules/auth/auth.middleware";
import { createChatRoutes } from "@/modules/chat/chat.routes";
import { createHealthRoutes } from "@/modules/health/health.routes";
import { createRagRoutes } from "@/modules/rag/rag.routes";
import type { RagService } from "@/modules/rag/rag.service";

export type AppDependencies = {
	env: Env;
	logger: Logger;
	rag: RagService;
	chatModel: LanguageModel;
	pingDatabase: () => Promise<void>;
};

export function createApp({ env, logger, rag, chatModel, pingDatabase }: AppDependencies) {
	const basePath = `/${env.API_PREFIX}/v${env.API_VERSION}`;
	const app = new OpenAPIHono<AppBindings>({
		// Zod failures use the shared error envelope (same shape as nest-api's VALIDATION_ERROR).
		defaultHook: (result, c) => {
			if (!result.success) {
				const errors = result.error.issues.map((issue) => ({
					path: issue.path.join("."),
					code: issue.code,
					message: issue.message,
				}));
				return c.json(
					errorBody(c, 422, "VALIDATION_ERROR", "Request validation failed", errors),
					422,
				);
			}
			return undefined;
		},
	});

	app.use("*", requestId);
	app.use("*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));
	app.use(
		"*",
		cors({
			origin: parseCorsOrigins(env.CORS_ORIGIN),
			allowHeaders: ["authorization", "content-type", "x-request-id"],
			exposeHeaders: ["x-request-id"],
			allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
			maxAge: 600,
		}),
	);
	app.use("*", async (c, next) => {
		const started = performance.now();
		await next();
		logger.info(
			`${c.req.method} ${c.req.path} ${c.res.status} ${Math.round(performance.now() - started)}ms ${c.get("requestId")}`,
		);
	});

	const auth = createAuthMiddleware(env.JWT_SECRET);
	app.use(`${basePath}/rag/*`, auth);
	app.use(`${basePath}/chat`, auth);
	app.use(`${basePath}/chat/*`, auth);

	app.route(
		`${basePath}/health`,
		createHealthRoutes({ serviceName: env.SERVICE_NAME, pingDatabase }),
	);
	app.route(`${basePath}/rag`, createRagRoutes(rag));
	app.route(
		`${basePath}/chat`,
		createChatRoutes({ rag, chatModel, maxSteps: env.CHAT_MAX_STEPS, topK: env.RAG_TOP_K }),
	);

	app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
		type: "http",
		scheme: "bearer",
		bearerFormat: "JWT",
		description: "Access token from apps/nest-api (POST /api/v1/auth/login)",
	});
	app.doc31(`/${env.API_PREFIX}/openapi.json`, {
		openapi: "3.1.0",
		info: {
			title: "Starter AI API",
			version: "0.1.0",
			description: "RAG (pgvector) and streaming tool-calling chat. Bun + Hono + AI SDK.",
		},
	});
	app.get(`/${env.API_PREFIX}/docs`, Scalar({ url: `/${env.API_PREFIX}/openapi.json` }));

	app.notFound(notFoundHandler);
	app.onError(createErrorHandler(logger));

	return app;
}

export type App = ReturnType<typeof createApp>;
