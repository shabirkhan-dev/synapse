import { can } from "@synapse/security";

import type { AuthUser } from "@/shared/types/app-types";

import type { RagReader } from "../types/rag.types";

/** The caller as a document reader: their organization, themselves, and whether they read all (ADR-0008). */
export function readerOf(user: AuthUser): RagReader {
	return {
		ownerId: user.orgId,
		userId: user.sub,
		readsAll: can(user.role, "documents.read_all"),
	};
}
