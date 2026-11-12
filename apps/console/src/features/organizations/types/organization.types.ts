import type { z } from "zod";

import type {
	addMemberFormSchema,
	memberSchema,
	membershipSchema,
	organizationSchema,
	switchedOrganizationSchema,
} from "../schemas/organization.schema";

export type Organization = z.infer<typeof organizationSchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type Member = z.infer<typeof memberSchema>;
export type SwitchedOrganization = z.infer<typeof switchedOrganizationSchema>;
export type AddMemberInput = z.infer<typeof addMemberFormSchema>;
export type SaveMemberInput = AddMemberInput & { organizationId: string };
export type RemoveMemberInput = { organizationId: string; userId: string };
