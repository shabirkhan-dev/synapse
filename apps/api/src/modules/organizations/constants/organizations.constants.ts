export const ORGANIZATION_ERROR_CODES = {
	NOT_FOUND: "ORGANIZATION_NOT_FOUND",
	FORBIDDEN: "ORGANIZATION_FORBIDDEN",
	PERSONAL: "ORGANIZATION_PERSONAL",
	LAST_OWNER: "ORGANIZATION_LAST_OWNER",
	USER_NOT_FOUND: "ORGANIZATION_USER_NOT_FOUND",
	MEMBER_NOT_FOUND: "ORGANIZATION_MEMBER_NOT_FOUND",
	USER_EXISTS: "ORGANIZATION_USER_EXISTS",
	TOO_MANY_INVITATIONS: "ORGANIZATION_TOO_MANY_INVITATIONS",
	INVITATION_NOT_FOUND: "ORGANIZATION_INVITATION_NOT_FOUND",
	INVITATION_INVALID: "ORGANIZATION_INVITATION_INVALID",
	INVITATION_OTHER_EMAIL: "ORGANIZATION_INVITATION_OTHER_EMAIL",
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
	INVITED: "Invitation sent",
	INVITATIONS_FETCHED: "Invitations retrieved",
	INVITATION_REVOKED: "Invitation withdrawn",
	INVITATION_ACCEPTED: "You joined the team",
	USER_EXISTS: "They already have an account: add them as a member instead",
	TOO_MANY_INVITATIONS: "This team has too many pending invitations; withdraw some first",
	INVITATION_NOT_FOUND: "No such pending invitation",
	INVITATION_INVALID:
		"This invitation link is invalid, was already used or has expired; ask for a new one",
	INVITATION_OTHER_EMAIL:
		"This invitation was sent to another email address; sign in with that address to accept it",
} as const;

/** How long an invitation link works. */
export const INVITATION_TTL_DAYS = 7;
/** Pending invitations one team may have at a time. */
export const MAX_PENDING_INVITATIONS = 50;
/** Console page that accepts an invitation (`?token=`). */
export const INVITATION_LINK_PATH = "/invite";

export const PERSONAL_ORGANIZATION_NAME = "Personal";
