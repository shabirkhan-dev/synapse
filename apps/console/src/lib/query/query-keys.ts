/** Every query key, used by queries and by invalidation alike (frontend rule 6). */
export const queryKeys = {
	documents: {
		all: ["documents"] as const,
	},
	currentUser: ["current-user"] as const,
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
	activity: {
		all: ["activity"] as const,
		list: (limit: number) => ["activity", { limit }] as const,
	},
};
