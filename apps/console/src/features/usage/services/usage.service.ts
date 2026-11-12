import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { usageSchema } from "../schemas/usage.schema";
import type { Usage } from "../types/usage.types";

export const usageService = {
	/** Answers, tokens and estimated cost over the last `days` UTC days. */
	summary: (days: number): Promise<Usage> =>
		api(endpoints.audit.usage(days), { schema: usageSchema }),
};
