"use client";

import { useState } from "react";

import { TwoStepCard } from "../components/two-step-card";
import { useDisableMfaMutation } from "../hooks/mutations/use-disable-mfa-mutation";
import { useEnableMfaMutation } from "../hooks/mutations/use-enable-mfa-mutation";
import { useSetupMfaMutation } from "../hooks/mutations/use-setup-mfa-mutation";
import { useMfaStatusQuery } from "../hooks/queries/use-mfa-status-query";

/** The Account page's two-step sign-in: set up (QR + confirm), recovery codes once, turn off. */
export function TwoStepContainer() {
	const status = useMfaStatusQuery();
	const setup = useSetupMfaMutation();
	const enable = useEnableMfaMutation();
	const disable = useDisableMfaMutation();
	const [codes, setCodes] = useState<string[] | null>(null);
	const inSetup = setup.data && !enable.isSuccess ? setup.data : null;

	return (
		<TwoStepCard
			status={status.data}
			setup={inSetup}
			recoveryCodes={codes}
			pending={setup.isPending || enable.isPending || disable.isPending}
			error={(status.error ?? setup.error ?? enable.error ?? disable.error)?.message ?? null}
			onStart={() => {
				enable.reset();
				disable.reset();
				setup.mutate();
			}}
			onConfirm={async (code) => setCodes(await enable.mutateAsync(code))}
			onCancel={() => {
				enable.reset();
				setup.reset();
			}}
			onDisable={(code) => disable.mutateAsync(code)}
			onDoneWithCodes={() => setCodes(null)}
		/>
	);
}
