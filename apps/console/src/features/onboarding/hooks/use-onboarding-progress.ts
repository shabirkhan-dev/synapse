import { useCallback, useEffect, useState } from "react";

import { ONBOARDING_STORAGE_PREFIX } from "../constants/onboarding.constants";

type Progress = { dismissed: boolean; triedPlayground: boolean };

const EMPTY: Progress = { dismissed: false, triedPlayground: false };

/**
 * What this browser remembers about a workspace's onboarding (hidden, Playground tried). Storage
 * may be unavailable (private windows, blocked site data): then it lasts until the page closes.
 */
export function useOnboardingProgress(organizationId: string | null) {
	const [progress, setProgress] = useState<Progress>(EMPTY);
	const key = organizationId ? `${ONBOARDING_STORAGE_PREFIX}${organizationId}` : null;

	useEffect(() => {
		if (!key) return;
		try {
			const stored = window.localStorage.getItem(key);
			setProgress(stored ? { ...EMPTY, ...(JSON.parse(stored) as Partial<Progress>) } : EMPTY);
		} catch {
			setProgress(EMPTY);
		}
	}, [key]);

	const update = useCallback(
		(change: Partial<Progress>) => {
			setProgress((current) => {
				const next = { ...current, ...change };
				try {
					if (key) window.localStorage.setItem(key, JSON.stringify(next));
				} catch {
					// Storage refused: the change still holds for this page.
				}
				return next;
			});
		},
		[key],
	);

	return { progress, update };
}
