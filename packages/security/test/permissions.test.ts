import { describe, expect, test } from "bun:test";

import { can, createAccessTokens, isOrganizationRole } from "../src";

describe("roles", () => {
	test("each role includes the roles below it", () => {
		expect(can("member", "documents.write")).toBe(true);
		expect(can("member", "approvals.decide")).toBe(false);
		expect(can("admin", "approvals.decide")).toBe(true);
		expect(can("admin", "members.manage_admins")).toBe(false);
		expect(can("owner", "members.manage_admins")).toBe(true);
		expect(isOrganizationRole("admin")).toBe(true);
		expect(isOrganizationRole("root")).toBe(false);
	});
});

describe("organization claim", () => {
	const tokens = createAccessTokens({ secret: "s".repeat(40), ttlSeconds: 900 });

	test("round-trips when present and is absent otherwise", async () => {
		const withOrg = await tokens.issue({ sub: "u1", sid: "s1", org: "o1" });
		expect(await tokens.verify(withOrg.token)).toEqual({ sub: "u1", sid: "s1", org: "o1" });
		const personal = await tokens.issue({ sub: "u1", sid: "s1" });
		expect(await tokens.verify(personal.token)).toEqual({ sub: "u1", sid: "s1" });
	});
});
