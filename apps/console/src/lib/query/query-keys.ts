/** Every query key, used by queries and by invalidation alike (frontend rule 6). */
export const queryKeys = {
	documents: {
		all: ["documents"] as const,
		detail: (id: string, offset: number) => ["documents", id, { offset }] as const,
	},
	currentUser: ["current-user"] as const,
	sessions: ["sessions"] as const,
	conversations: {
		all: ["conversations"] as const,
		detail: (id: string) => ["conversations", id] as const,
	},
	organizations: {
		all: ["organizations"] as const,
		members: (organizationId: string) => ["organizations", organizationId, "members"] as const,
	},
	approvals: {
		pending: ["approvals", "pending"] as const,
	},
	usage: {
		all: ["usage"] as const,
		range: (days: number) => ["usage", { days }] as const,
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
