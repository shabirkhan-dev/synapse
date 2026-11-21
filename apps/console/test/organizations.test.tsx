import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { OrganizationSwitcherContainer, TeamContainer } from "@/features/organizations";
import { MembersTable } from "@/features/organizations/components/members-table";
import { getAccessToken, setAccessToken } from "@/lib/api/session";

import { type Call, failure, mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

afterEach(() => {
	cleanup();
	setAccessToken(null);
});

type Role = "owner" | "admin" | "member";
const me = (organizationId: string, role: Role) => ({
	id: "u1",
	email: "ada@example.com",
	emailVerifiedAt: null,
	organization: { id: organizationId, role },
});
const personal = { id: "u1", name: "Personal", kind: "personal", role: "owner", createdAt: "x" };
const team = (role: Role) => ({ id: "t1", name: "Support", kind: "team", role, createdAt: "x" });
const member = (userId: string, email: string, role: Role) => ({
	userId,
	email,
	role,
	createdAt: "2026-11-12T10:00:00Z",
});
const MEMBERS = [
	member("u1", "ada@example.com", "admin"),
	member("u2", "bob@example.com", "member"),
	member("u3", "cy@example.com", "owner"),
];

const is = (call: Call, method: string, path: string) =>
	call.method === method && call.url.endsWith(path);

describe("MembersTable", () => {
	test("an admin manages members, not admins, owners or their own row", () => {
		const onRemove = mock();
		render(
			<MembersTable
				members={MEMBERS}
				currentUserId="u1"
				assignableRoles={["member"]}
				busyUserId={null}
				onRoleChange={mock()}
				onRemove={onRemove}
			/>,
		);
		expect(screen.getByText("(you)")).toBeDefined();
		expect(screen.getAllByRole("button", { name: /^Remove / })).toHaveLength(1);
		expect(screen.getByRole("combobox", { name: "Role of bob@example.com" })).toBeDefined();
		expect(screen.queryByRole("combobox", { name: "Role of cy@example.com" })).toBeNull();
		expect(screen.queryByRole("combobox", { name: "Role of ada@example.com" })).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Remove bob@example.com" }));
		expect(onRemove).toHaveBeenCalledWith(MEMBERS[1]);
	});

	test("an owner manages everyone but themselves", () => {
		render(
			<MembersTable
				members={MEMBERS}
				currentUserId="u3"
				assignableRoles={["owner", "admin", "member"]}
				busyUserId={null}
				onRoleChange={mock()}
				onRemove={mock()}
			/>,
		);
		expect(screen.getAllByRole("button", { name: /^Remove / })).toHaveLength(2);
		expect(screen.queryByRole("button", { name: "Remove cy@example.com" })).toBeNull();
	});
});

describe("TeamContainer (mocked API)", () => {
	test("in the personal organization: explains it, and creating a team switches into it", async () => {
		signedIn();
		let active = "u1";
		const calls = mockFetch((call) => {
			if (call.url.endsWith("/auth/me")) return ok(me(active, "owner"));
			if (is(call, "POST", "/organizations"))
				return ok({ id: "t1", name: "Support", kind: "team", createdAt: "x" }, 201);
			if (is(call, "POST", "/auth/switch-organization")) {
				active = "t1";
				return ok({ accessToken: "team-token", organizationId: "t1", role: "owner" });
			}
			if (is(call, "GET", "/organizations"))
				return ok(active === "t1" ? [personal, team("owner")] : [personal]);
			if (call.url.endsWith("/organizations/t1/members"))
				return ok([member("u1", "ada@example.com", "owner")]);
			return failure(404, "NOT_FOUND", "Not found");
		});
		renderWithQuery(<TeamContainer />);
		await screen.findByText(/This is your personal workspace/);

		fireEvent.change(screen.getByLabelText("Team name"), { target: { value: "  Support  " } });
		fireEvent.click(screen.getByRole("button", { name: "Create team" }));

		await screen.findByRole("heading", { name: "Support" });
		await screen.findByText("(you)");
		const created = calls.find((call) => is(call, "POST", "/organizations"));
		expect(created?.body).toEqual({ name: "Support" });
		const switched = calls.find((call) => is(call, "POST", "/auth/switch-organization"));
		expect(switched?.body).toEqual({ organizationId: "t1" });
		expect(getAccessToken()).toBe("team-token");
		// Later requests carry the team's token.
		const membersCall = calls.find((call) => call.url.endsWith("/organizations/t1/members"));
		expect(membersCall?.headers.get("authorization")).toBe("Bearer team-token");
	});

	test("an admin adds a member by email; an address without an account is invited instead", async () => {
		signedIn();
		let members = MEMBERS.slice(0, 1);
		let invitations: Array<Record<string, string>> = [];
		const calls = mockFetch((call) => {
			if (call.url.endsWith("/auth/me")) return ok(me("t1", "admin"));
			if (is(call, "GET", "/organizations")) return ok([personal, team("admin")]);
			if (is(call, "POST", "/organizations/t1/members")) {
				const { email } = call.body as { email: string };
				if (email !== "bob@example.com")
					return failure(
						404,
						"ORGANIZATION_USER_NOT_FOUND",
						"No account with this email; ask them to sign up first",
					);
				members = [...members, member("u2", email, "member")];
				return ok(members);
			}
			if (is(call, "POST", "/organizations/t1/invitations")) {
				const { email } = call.body as { email: string };
				if (email === "full@example.com")
					return failure(
						409,
						"ORGANIZATION_TOO_MANY_INVITATIONS",
						"This team has too many pending invitations; withdraw some first",
					);
				const invitation = {
					id: `i-${invitations.length + 1}`,
					email,
					role: "member",
					expiresAt: "2026-11-28T10:00:00Z",
					createdAt: "2026-11-21T10:00:00Z",
				};
				invitations = [invitation, ...invitations];
				return ok(invitation, 201);
			}
			if (is(call, "GET", "/organizations/t1/invitations")) return ok(invitations);
			if (call.method === "DELETE" && call.url.includes("/invitations/")) {
				invitations = [];
				return ok({ id: "i-1" });
			}
			return ok(members);
		});
		renderWithQuery(<TeamContainer />);
		await screen.findByText("anyone without an account yet gets an invitation", { exact: false });

		// No account: the console sends an invitation instead and lists it.
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
		fireEvent.click(screen.getByRole("button", { name: "Add member" }));
		await screen.findByText("Invited new@example.com.", { exact: false });
		const pending = (await screen.findByText("Invited, not joined yet")).closest("section");
		expect(within(pending as HTMLElement).getByText("new@example.com")).toBeDefined();
		const invited = calls.findLast((call) => is(call, "POST", "/organizations/t1/invitations"));
		expect(invited?.body).toEqual({ email: "new@example.com", role: "member" });

		// Withdrawing it removes it from the list.
		fireEvent.click(screen.getByLabelText("Withdraw the invitation to new@example.com"));
		await waitFor(() => expect(screen.queryByText("Invited, not joined yet")).toBeNull());

		// An invitation the API refuses shows why and keeps the address.
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: "full@example.com" } });
		fireEvent.click(screen.getByRole("button", { name: "Add member" }));
		await screen.findByText("This team has too many pending invitations; withdraw some first");
		expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("full@example.com");

		// An existing account is added directly.
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bob@example.com" } });
		fireEvent.click(screen.getByRole("button", { name: "Add member" }));
		const table = await screen.findByRole("table");
		await within(table).findByText("bob@example.com");
		await waitFor(() =>
			expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe(""),
		);
		const added = calls.findLast((call) => is(call, "POST", "/organizations/t1/members"));
		expect(added?.body).toEqual({ email: "bob@example.com", role: "member" });
	}, 20_000);

	test("a member sees the team but cannot change it", async () => {
		signedIn();
		mockFetch((call) => {
			if (call.url.endsWith("/auth/me")) return ok(me("t1", "member"));
			if (is(call, "GET", "/organizations")) return ok([personal, team("member")]);
			return ok(MEMBERS);
		});
		renderWithQuery(<TeamContainer />);
		await screen.findByText("Only admins and owners add people or change roles.");
		await screen.findByText("bob@example.com");
		expect(screen.queryByRole("button", { name: "Add member" })).toBeNull();
		expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
		expect(screen.queryByRole("combobox")).toBeNull();
	});
});

// Picking another organization is covered in the browser (tests/e2e/specs/teams.spec.ts):
// happy-dom does not deliver the pointer sequence Base UI's select needs to pick an option.
describe("OrganizationSwitcherContainer (mocked API)", () => {
	test("shows the organization the session acts in", async () => {
		signedIn();
		mockFetch((call) =>
			call.url.endsWith("/auth/me") ? ok(me("t1", "member")) : ok([personal, team("member")]),
		);
		renderWithQuery(<OrganizationSwitcherContainer />);
		const picker = await screen.findByRole("combobox", { name: "Organization" });
		await waitFor(() => expect(picker.textContent).toContain("Support"));
	});
});
