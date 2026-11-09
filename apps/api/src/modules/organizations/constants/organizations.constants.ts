export const ORGANIZATION_ERROR_CODES = {
	NOT_FOUND: "ORGANIZATION_NOT_FOUND",
	FORBIDDEN: "ORGANIZATION_FORBIDDEN",
	PERSONAL: "ORGANIZATION_PERSONAL",
	LAST_OWNER: "ORGANIZATION_LAST_OWNER",
	USER_NOT_FOUND: "ORGANIZATION_USER_NOT_FOUND",
	MEMBER_NOT_FOUND: "ORGANIZATION_MEMBER_NOT_FOUND",
} as const;

export const ORGANIZATION_MESSAGES = {
	CREATED: "Organization created",
	FETCHED: "Organizations retrieved",
	MEMBERS_FETCHED: "Members retrieved",
	MEMBER_SAVED: "Member saved",
	MEMBER_REMOVED: "Member removed",
	NOT_FOUND: "Organization not found",
	FORBIDDEN: "Your role in this organization does not allow this",
	PERSONAL: "A personal organization has exactly one member",
	LAST_OWNER: "An organization needs at least one owner",
	USER_NOT_FOUND: "No account with this email; ask them to sign up first",
	MEMBER_NOT_FOUND: "Not a member of this organization",
} as const;

export const PERSONAL_ORGANIZATION_NAME = "Personal";
