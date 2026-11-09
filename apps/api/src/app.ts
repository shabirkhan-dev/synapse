import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import type { Logger } from "@synapse/observability";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import { registerRoutes, type RouteDependencies } from "@/routes";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { RESPONSE_MESSAGES } from "@/shared/constants/response-messages";
import { createErrorHandler, notFoundHandler } from "@/shared/errors/error-handler";
import { requestId } from "@/shared/middleware/request-id";
import { createRequestTracing } from "@/shared/middleware/request-tracing";
import { failure } from "@/shared/responses/error-response";
import type { AppBindings } from "@/shared/types/app-types";

export type AppDependencies = RouteDependencies & { logger: Logger };

export function createApp({ logger, ...dependencies }: AppDependencies) {
	const { apiPrefix, corsOrigins } = dependencies.config.app;
	const app = new OpenAPIHono<AppBindings>({
		// Zod failures use the shared error envelope.
		defaultHook: (result, c) => {
			if (!result.success) {
				const errors = result.error.issues.map((issue) => ({
					path: issue.path.join("."),
					code: issue.code,
					message: issue.message,
				}));
				return failure(
					c,
					HTTP_STATUS.UNPROCESSABLE_ENTITY,
					ERROR_CODES.VALIDATION_ERROR,
					RESPONSE_MESSAGES.ERRORS.VALIDATION_FAILED,
					errors,
				);
			}
			return undefined;
		},
	});

	app.use("*", requestId);
	app.use("*", createRequestTracing(logger));
	app.use("*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));
	app.use(
		"*",
		cors({
			origin: corsOrigins,
			allowHeaders: ["authorization", "content-type", "x-request-id"],
			exposeHeaders: ["x-request-id", "x-conversation-id"],
			allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
			// The console's refresh-token cookie (ADR-0007); origins stay an explicit allow-list.
			credentials: true,
			maxAge: 600,
		}),
	);

	registerRoutes(app, dependencies);

	app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
		type: "http",
		scheme: "bearer",
		bearerFormat: "JWT",
		description: "HS256 access token signed with JWT_SECRET",
	});
	app.doc31(`/${apiPrefix}/openapi.json`, {
		openapi: "3.1.0",
		info: {
			title: "Synapse AI API",
			version: "0.1.0",
			description: "RAG (pgvector) and streaming tool-calling chat. Bun + Hono + AI SDK.",
		},
	});
	app.get(`/${apiPrefix}/docs`, Scalar({ url: `/${apiPrefix}/openapi.json` }));

	app.notFound(notFoundHandler);
	app.onError(createErrorHandler(logger));

	return app;
}

export type App = ReturnType<typeof createApp>;
