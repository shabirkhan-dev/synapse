/** API paths, relative to `apiConfig.baseUrl` (`/api/v1`). */
export const endpoints = {
	auth: {
		signIn: "/auth/sign-in",
		signUp: "/auth/sign-up",
		refresh: "/auth/refresh",
		signOut: "/auth/sign-out",
		verifyEmail: "/auth/verify-email",
		forgotPassword: "/auth/password/forgot",
		resetPassword: "/auth/password/reset",
		me: "/auth/me",
	},
	rag: {
		query: "/rag/query",
	},
	oversight: {
		feedback: "/oversight/feedback",
		approvals: "/oversight/approvals",
		approve: (id: string) => `/oversight/approvals/${encodeURIComponent(id)}/approve`,
		reject: (id: string) => `/oversight/approvals/${encodeURIComponent(id)}/reject`,
	},
	audit: {
		events: "/audit/events",
	},
	documents: {
		list: "/rag/documents",
		ingest: "/rag/documents",
		purge: "/rag/documents/purge",
	},
} as const;
