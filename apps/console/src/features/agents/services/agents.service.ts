import { z } from "zod";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { agentRunSchema, agentsOverviewSchema } from "../schemas/agents.schema";
import type { AgentRun, AgentsOverview } from "../types/agents.types";

export const agentsService = {
	/** Models, prompts, tools and limits the assistants run on (no credentials). */
	overview: (): Promise<AgentsOverview> =>
		api(endpoints.agents.overview, { schema: agentsOverviewSchema }),

	/** Latest chat and cited answers; members get their own. */
	runs: (): Promise<AgentRun[]> => api(endpoints.agents.runs, { schema: z.array(agentRunSchema) }),
};
