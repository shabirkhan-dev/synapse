/** Every query key, used by queries and by invalidation alike (frontend rule 6). */
export const queryKeys = {
	documents: {
		all: ["documents"] as const,
		/** Documents whose title contains `q` (the palette's server search). */
		search: (q: string) => ["documents", "search", q] as const,
		detail: (id: string, offset: number) => ["documents", id, { offset }] as const,
	},
	currentUser: ["current-user"] as const,
	sessions: ["sessions"] as const,
	apiKeys: ["api-keys"] as const,
	mfa: ["mfa"] as const,
	/** Suggested next questions for one answer (never refetched: the same answer, same ideas). */
	followUps: (question: string, answer: string) => ["follow-ups", question, answer] as const,
	conversations: {
		all: ["conversations"] as const,
		search: (q: string) => ["conversations", "search", q] as const,
		detail: (id: string) => ["conversations", id] as const,
	},
	organizations: {
		all: ["organizations"] as const,
		members: (organizationId: string) => ["organizations", organizationId, "members"] as const,
		invitations: (organizationId: string) =>
			["organizations", organizationId, "invitations"] as const,
		/** The team's single sign-on settings. */
		sso: (organizationId: string) => ["organizations", organizationId, "sso"] as const,
	},
	approvals: {
		pending: ["approvals", "pending"] as const,
	},
	usage: {
		all: ["usage"] as const,
		range: (days: number) => ["usage", { days }] as const,
	},
	system: {
		status: ["system", "status"] as const,
	},
	agents: {
		overview: ["agents", "overview"] as const,
		runs: ["agents", "runs"] as const,
	},
	evaluations: {
		questions: ["evaluations", "questions"] as const,
		runs: ["evaluations", "runs"] as const,
		run: (id: string) => ["evaluations", "runs", id] as const,
	},
	activity: {
		all: ["activity"] as const,
		list: (limit: number) => ["activity", { limit }] as const,
	},
};
