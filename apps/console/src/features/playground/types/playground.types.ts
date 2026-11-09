import type { z } from "zod";

import type {
	feedbackSchema,
	questionFormSchema,
	ragAnswerSchema,
} from "../schemas/playground.schema";

export type QuestionInput = z.output<typeof questionFormSchema>;
export type RagAnswer = z.infer<typeof ragAnswerSchema>;
export type RagMatch = RagAnswer["matches"][number];
export type Citation = RagAnswer["citations"][number];
export type Provenance = NonNullable<RagAnswer["provenance"]>;
export type Rating = z.infer<typeof feedbackSchema>["rating"];

/** An answer plus the request id that feedback refers to. */
export type AskedQuestion = RagAnswer & { question: string; requestId: string };
