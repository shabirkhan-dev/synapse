import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { errorResponses } from "@/shared/responses/error-response";
import { apiErrorSchema, successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { AUTH_MESSAGES } from "../constants/auth.constants";
import {
	apiKeyIdParamsSchema,
	apiKeySchema,
	createApiKeyBodySchema,
	createdApiKeySchema,
} from "../schemas/api-key.schemas";
import type { ApiKeysService } from "../services/api-keys.service";

const tags = ["API keys"];
const security = [{ bearerAuth: [] }];
const sessionOnly = {
	403: {
		description: "Called with an API key: keys are managed from a signed-in session",
		content: { "application/json": { schema: apiErrorSchema } },
	},
} as const;

const listRoute = createRoute({
	method: "get",
	path: "/",
	tags,
	summary: "Your personal API keys (never the keys themselves)",
	security,
	responses: {
		200: {
			description: "Newest first",
			content: { "application/json": { schema: successEnvelope(z.array(apiKeySchema)) } },
		},
		...sessionOnly,
		...errorResponses,
	},
});

const createKeyRoute = createRoute({
	method: "post",
	path: "/",
	tags,
	summary: "Create an API key for the organization you are in",
	description:
		"The key acts as you in your active organization, with your role there checked on every request (it stops working if you leave). Send it as `Authorization: Bearer syn_…`. Shown only in this response; at most 20 keys per user.",
	security,
	request: {
		body: { required: true, content: { "application/json": { schema: createApiKeyBodySchema } } },
	},
	responses: {
		201: {
			description: "The new key",
			content: { "application/json": { schema: successEnvelope(createdApiKeySchema) } },
		},
		409: {
			description: "Too many keys",
			content: { "application/json": { schema: apiErrorSchema } },
		},
		...sessionOnly,
		...errorResponses,
	},
});

const revokeRoute = createRoute({
	method: "delete",
	path: "/{id}",
	tags,
	summary: "Revoke an API key (it stops working at once)",
	security,
	request: { params: apiKeyIdParamsSchema },
	responses: {
		200: {
			description: "Revoked",
			content: { "application/json": { schema: successEnvelope(z.object({ id: z.uuid() })) } },
		},
		404: {
			description: "Not one of your keys",
			content: { "application/json": { schema: apiErrorSchema } },
		},
		...sessionOnly,
		...errorResponses,
	},
});

export function createApiKeyRoutes(apiKeys: ApiKeysService) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(listRoute, async (c) => {
		const keys = await apiKeys.list(c.get("user"));
		return success(c, keys, AUTH_MESSAGES.API_KEYS_FETCHED, HTTP_STATUS.OK);
	});

	app.openapi(createKeyRoute, async (c) => {
		const created = await apiKeys.create(c.get("user"), c.req.valid("json"), {
			requestId: c.get("requestId"),
		});
		return success(c, created, AUTH_MESSAGES.API_KEY_CREATED, HTTP_STATUS.CREATED);
	});

	app.openapi(revokeRoute, async (c) => {
		const { id } = c.req.valid("param");
		await apiKeys.revoke(c.get("user"), id, { requestId: c.get("requestId") });
		return success(c, { id }, AUTH_MESSAGES.API_KEY_REVOKED, HTTP_STATUS.OK);
	});

	return app;
}
