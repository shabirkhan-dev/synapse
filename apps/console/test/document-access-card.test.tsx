import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { DocumentAccessCard } from "@/features/documents/components/document-access-card";

afterEach(() => {
	cleanup();
});

const members = [
	{ userId: "ada", email: "ada@example.com", role: "owner" as const },
	{ userId: "bob", email: "bob@example.com", role: "member" as const },
	{ userId: "cy", email: "cy@example.com", role: "member" as const },
];

describe("DocumentAccessCard", () => {
	test("a manager restricts a document to chosen people; owners and its adder always read it", () => {
		const onSave = mock(() => {});
		render(
			<DocumentAccessCard
				access="organization"
				sharedWith={[]}
				members={members}
				createdBy="bob"
				canManage
				saving={false}
				error={null}
				onSave={onSave}
			/>,
		);
		expect(screen.getByText(/Everyone in the team can find and read it/)).toBeDefined();
		const save = screen.getByRole("button", { name: "Save who can see it" });
		expect(save.hasAttribute("disabled")).toBe(true);

		fireEvent.click(screen.getByRole("button", { name: "Only people you choose" }));
		// The owner and the adder are shown as always reading it.
		expect(screen.getByText("owner, always")).toBeDefined();
		expect(screen.getByText("added it")).toBeDefined();
		fireEvent.click(screen.getByText("cy@example.com"));
		fireEvent.click(save);
		expect(onSave).toHaveBeenCalledWith({ access: "restricted", userIds: ["cy"] });
	});

	test("someone who may not manage it sees who can read it, without controls", () => {
		render(
			<DocumentAccessCard
				access="restricted"
				sharedWith={["cy"]}
				members={members}
				createdBy="bob"
				canManage={false}
				saving={false}
				error={null}
				onSave={() => {}}
			/>,
		);
		expect(screen.getByText(/whoever added it and 1 person, plus owners and admins/)).toBeDefined();
		expect(screen.queryByRole("button", { name: "Save who can see it" })).toBeNull();
	});
});
