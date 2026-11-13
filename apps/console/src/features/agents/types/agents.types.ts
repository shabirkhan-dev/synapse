import type { z } from "zod";

import type { agentRunSchema, agentsOverviewSchema } from "../schemas/agents.schema";

export type AgentsOverview = z.infer<typeof agentsOverviewSchema>;
export type AgentRun = z.infer<typeof agentRunSchema>;
