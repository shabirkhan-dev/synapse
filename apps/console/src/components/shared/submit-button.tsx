"use client";

import { Button } from "@synapse/ui/components/button";
import { type ComponentProps, useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * A form's submit button, disabled until React has hydrated the page: before that a click would
 * do nothing (the form's handler is not attached yet), so the button says so instead.
 */
export function SubmitButton({ disabled, ...props }: ComponentProps<typeof Button>) {
	const hydrated = useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
	return <Button type="submit" disabled={!hydrated || disabled} {...props} />;
}
