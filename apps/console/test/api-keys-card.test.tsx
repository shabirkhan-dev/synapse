import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ApiKeysCard } from "@/features/account/components/api-keys-card";

afterEach(() => {
	cleanup();
});

const key = {
	id: "k1",
	name: "Nightly import",
	prefix: "syn_Ab12Cd34",
	organizationId: "t1",
	expiresAt: null,
	lastUsedAt: null,
	createdAt: "2026-11-21T10:00:00Z",
};

describe("ApiKeysCard", () => {
	test("lists keys by prefix and organization, creates one, and shows a new key once", async () => {
		const onCreate = mock(async () => {});
		const onRevoke = mock(() => {});
		const { rerender } = render(
			<ApiKeysCard
				keys={[key]}
				organizationName={() => "Support"}
				activeOrganization="Support"
				created={null}
				creating={false}
				revokingId={null}
				error={null}
				onCreate={onCreate}
				onRevoke={onRevoke}
				onDismissCreated={() => {}}
			/>,
		);
		expect(screen.getByText("Nightly import")).toBeDefined();
		expect(screen.getByText(/Support · never used/)).toBeDefined();

		fireEvent.click(screen.getByRole("button", { name: "Create a key for Support" }));
		await screen.findByText("Name the key (what will use it?)");
		fireEvent.change(screen.getByLabelText("New key's name"), { target: { value: "CI" } });
		fireEvent.click(screen.getByRole("button", { name: "Create a key for Support" }));
		await waitFor(() => expect(onCreate).toHaveBeenCalledWith("CI"));

		fireEvent.click(screen.getByLabelText("Revoke the key “Nightly import”"));
		expect(onRevoke).toHaveBeenCalledWith(key);

		rerender(
			<ApiKeysCard
				keys={[key]}
				organizationName={() => "Support"}
				activeOrganization="Support"
				created={{ name: "CI", key: "syn_secretvalue" }}
				creating={false}
				revokingId={null}
				error={null}
				onCreate={onCreate}
				onRevoke={onRevoke}
				onDismissCreated={() => {}}
			/>,
		);
		expect(screen.getByText("Copy “CI” now: it is not shown again")).toBeDefined();
		expect(screen.getByText("syn_secretvalue")).toBeDefined();
	});
});
