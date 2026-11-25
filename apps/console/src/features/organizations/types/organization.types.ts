import type { z } from "zod";

import type {
	addMemberFormSchema,
	invitationSchema,
	memberSchema,
	membershipSchema,
	organizationSchema,
	ssoConnectionSchema,
	ssoFormSchema,
	switchedOrganizationSchema,
} from "../schemas/organization.schema";

export type Organization = z.infer<typeof organizationSchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type Member = z.infer<typeof memberSchema>;
export type SwitchedOrganization = z.infer<typeof switchedOrganizationSchema>;
export type AddMemberInput = z.infer<typeof addMemberFormSchema>;
export type SaveMemberInput = AddMemberInput & { organizationId: string };
export type RemoveMemberInput = { organizationId: string; userId: string };
export type Invitation = z.infer<typeof invitationSchema>;
export type RevokeInvitationInput = { organizationId: string; invitationId: string };

export type SsoConnection = z.infer<typeof ssoConnectionSchema>;
export type SsoSettingsInput = z.infer<typeof ssoFormSchema>;
