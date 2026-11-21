"use client";

import { useState } from "react";

import { useCurrentUserQuery } from "@/features/auth";
import { useOrganizationsQuery } from "@/features/organizations";

import { ApiKeysCard } from "../components/api-keys-card";
import { useCreateApiKeyMutation } from "../hooks/mutations/use-create-api-key-mutation";
import { useRevokeApiKeyMutation } from "../hooks/mutations/use-revoke-api-key-mutation";
import { useApiKeysQuery } from "../hooks/queries/use-api-keys-query";

/** The Account page's API keys: list, create (shown once), revoke. */
export function ApiKeysContainer() {
	const keys = useApiKeysQuery();
	const create = useCreateApiKeyMutation();
	const revoke = useRevokeApiKeyMutation();
	const me = useCurrentUserQuery();
	const organizations = useOrganizationsQuery();
	const [created, setCreated] = useState<{ name: string; key: string } | null>(null);
	const nameOf = (organizationId: string) =>
		organizations.data?.find((organization) => organization.id === organizationId)?.name ??
		"a team you left";
	const activeId = me.data?.organization.id ?? "";

	return (
		<ApiKeysCard
			keys={keys.data}
			organizationName={nameOf}
			activeOrganization={nameOf(activeId)}
			created={created}
			creating={create.isPending}
			revokingId={revoke.isPending ? (revoke.variables ?? null) : null}
			error={(keys.error ?? create.error ?? revoke.error)?.message ?? null}
			onCreate={async (name) => {
				revoke.reset();
				const result = await create.mutateAsync(name);
				setCreated({ name: result.apiKey.name, key: result.key });
			}}
			onRevoke={(key) => {
				create.reset();
				revoke.mutate(key.id);
			}}
			onDismissCreated={() => setCreated(null)}
		/>
	);
}
