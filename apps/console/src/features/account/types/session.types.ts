import type { z } from "zod";

import type { sessionSchema } from "../schemas/session.schema";

export type Session = z.infer<typeof sessionSchema>;
