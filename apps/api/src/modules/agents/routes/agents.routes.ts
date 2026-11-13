import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorResponses } from "@/shared/responses/error-response";
import { successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { AGENT_MESSAGES } from "../constants/agents.constants";
import { agentRunSchema, agentsOverviewSchema } from "../schemas/agents.schemas";
import type { AgentsService } from "../services/agents.service";

const tags = ["Agents"];
const security = [{ bearerAuth: [] }];

const overviewRoute = createRoute({
	method: "get",
	path: "/",
	tags,
	summary: "What the chat assistant and the answer graph run on: models, prompts, tools, limits",
	security,
	responses: {
		200: {
			description: "Configuration (no credentials)",
			content: { "application/json": { schema: successEnvelope(agentsOverviewSchema) } },
		},
		...errorResponses,
	},
});

const runsRoute = createRoute({
	method: "get",
	path: "/runs",
	tags,
	summary: "Recent chat and cited answers (admins and owners: everyone's; members: their own)",
	security,
	responses: {
		200: {
			description: "Newest first",
			content: { "application/json": { schema: successEnvelope(z.array(agentRunSchema)) } },
		},
		...errorResponses,
	},
});

export function createAgentRoutes(agents: AgentsService) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(overviewRoute, (c) => success(c, agents.overview(), AGENT_MESSAGES.OVERVIEW_FETCHED));

	app.openapi(runsRoute, async (c) => {
		const runs = await agents.runs(c.get("user"));
		return success(c, runs, AGENT_MESSAGES.RUNS_FETCHED);
	});

	return app;
}
