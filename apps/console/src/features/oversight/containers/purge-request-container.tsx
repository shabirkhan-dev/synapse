"use client";

import { PurgeRequest } from "../components/purge-request";
import { useRequestPurgeMutation } from "../hooks/mutations/use-request-purge-mutation";

/** The Documents page's "delete all" control: it files an approval request. */
export function PurgeRequestContainer() {
	const purge = useRequestPurgeMutation();
	return (
		<PurgeRequest
			pending={purge.isPending}
			requested={purge.isSuccess}
			error={purge.error ? purge.error.message : null}
			onRequest={() => purge.mutate()}
		/>
	);
}
