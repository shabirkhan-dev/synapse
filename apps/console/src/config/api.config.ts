import { z } from "zod";

/**
 * Browser config: only `NEXT_PUBLIC_*` values, inlined by Next at build time. Read nowhere else
 * (configuration rule). The default matches the API's local port and base path.
 */
const schema = z.object({
	NEXT_PUBLIC_API_URL: z.url().default("http://localhost:8000/api/v1"),
});

const env = schema.parse({
	// Each variable is referenced by its full name so Next can inline it.
	NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || undefined,
});

export const apiConfig = {
	/** e.g. `http://localhost:8000/api/v1`, without a trailing slash. */
	baseUrl: env.NEXT_PUBLIC_API_URL.replace(/\/$/, ""),
} as const;
