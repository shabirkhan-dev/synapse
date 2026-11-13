import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { systemStatusSchema } from "../schemas/system.schema";
import type { SystemStatus } from "../types/system.types";

export const systemService = {
	/** Admins and owners only; members get a 403. */
	status: (): Promise<SystemStatus> => api(endpoints.system.status, { schema: systemStatusSchema }),
};
