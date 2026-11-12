import type { z } from "zod";

import type { MODES } from "../constants/retrieval.constants";
import type { compareFormSchema, matchSchema } from "../schemas/retrieval.schema";

export type SearchMode = (typeof MODES)[number]["mode"];
export type Match = z.infer<typeof matchSchema>;
export type CompareInput = z.output<typeof compareFormSchema>;

/** One mode's outcome: its passages, or why it failed (the others may still have worked). */
export type ModeResult =
	| { mode: SearchMode; status: "ok"; matches: Match[] }
	| { mode: SearchMode; status: "failed"; message: string };
