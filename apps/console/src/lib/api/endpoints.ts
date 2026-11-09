/** API paths, relative to `apiConfig.baseUrl` (`/api/v1`). */
export const endpoints = {
	auth: {
		signIn: "/auth/sign-in",
		refresh: "/auth/refresh",
		signOut: "/auth/sign-out",
	},
	documents: {
		list: "/rag/documents",
		ingest: "/rag/documents",
	},
} as const;
