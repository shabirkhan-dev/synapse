import type { UserRow } from "@synapse/database";

import type { User, UserCredentials } from "../types/auth.types";

/** Database row → user without the password hash. */
export function toUser(row: UserRow): User {
	return {
		id: row.id,
		email: row.email,
		emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
	};
}

export function toUserCredentials(row: UserRow): UserCredentials {
	return { ...toUser(row), passwordHash: row.passwordHash };
}
