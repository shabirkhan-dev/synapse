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
	},
	documents: {
		list: "/rag/documents",
		ingest: "/rag/documents",
	},
} as const;
