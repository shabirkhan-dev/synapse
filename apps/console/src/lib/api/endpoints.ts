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
		switchOrganization: "/auth/switch-organization",
		resendVerification: "/auth/verify-email/resend",
		sessions: "/auth/sessions",
		session: (id: string) => `/auth/sessions/${encodeURIComponent(id)}`,
		revokeOtherSessions: "/auth/sessions/revoke-others",
	},
	organizations: {
		list: "/organizations",
		create: "/organizations",
		members: (id: string) => `/organizations/${encodeURIComponent(id)}/members`,
		member: (id: string, userId: string) =>
			`/organizations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
	},
	rag: {
		query: "/rag/query",
	},
	chat: {
		send: "/chat",
	},
	memory: {
		conversations: "/memory/conversations",
		conversation: (id: string) => `/memory/conversations/${encodeURIComponent(id)}`,
	},
	oversight: {
		feedback: "/oversight/feedback",
		approvals: "/oversight/approvals",
		approve: (id: string) => `/oversight/approvals/${encodeURIComponent(id)}/approve`,
		reject: (id: string) => `/oversight/approvals/${encodeURIComponent(id)}/reject`,
	},
	audit: {
		events: "/audit/events",
		usage: (days: number) => `/audit/usage?days=${days}`,
	},
	system: {
		status: "/system/status",
	},
	agents: {
		overview: "/agents",
		runs: "/agents/runs",
	},
	evaluations: {
		questions: "/evaluations/questions",
		question: (id: string) => `/evaluations/questions/${encodeURIComponent(id)}`,
		runs: "/evaluations/runs",
		run: (id: string) => `/evaluations/runs/${encodeURIComponent(id)}`,
	},
	documents: {
		list: "/rag/documents",
		ingest: "/rag/documents",
		purge: "/rag/documents/purge",
		upload: "/rag/documents/upload",
		detail: (id: string) => `/rag/documents/${encodeURIComponent(id)}`,
	},
} as const;
