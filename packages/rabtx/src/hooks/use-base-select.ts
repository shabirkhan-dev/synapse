import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const supported = () => typeof CSS !== "undefined" && CSS.supports("appearance", "base-select");

/**
 * Whether this browser draws a customizable `<select>` list (`appearance: base-select`). Always false
 * on the server and during hydration, so server and client markup match; true right after, where
 * supported.
 */
export function useBaseSelect() {
	return useSyncExternalStore(subscribe, supported, () => false);
}
