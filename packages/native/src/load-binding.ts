import { createRequire } from "node:module";

import { bindingFileName } from "./binding-name";

/** What `crates/bindings` exports (napi-rs camelCases the Rust names). */
export type NativeBinding = {
	tokenizer(): string;
	countTokens(text: string): number;
	countTokensBatch(texts: string[]): number[];
};

export type BindingStatus =
	| { loaded: true; binding: NativeBinding; file: string }
	| { loaded: false; file: string; reason: string };

/**
 * Where the compiled binding may be: `packages/native/bin/` (from source, where
 * `bun run build:native` puts it) or `bin/` next to an app's bundle (copied by its build).
 */
const BIN_DIRS = [new URL("../bin/", import.meta.url), new URL("./bin/", import.meta.url)];

/**
 * Load the compiled binding for this platform once. A missing or broken binding is not an error:
 * callers get the TypeScript fallback and `reason` says why (e.g. not built in this image).
 */
export function loadBinding(file: string = bindingFileName()): BindingStatus {
	const load = createRequire(import.meta.url);
	const reasons: string[] = [];
	for (const dir of BIN_DIRS) {
		const path = new URL(file, dir).pathname;
		try {
			return { loaded: true, binding: load(path) as NativeBinding, file };
		} catch (error) {
			reasons.push(error instanceof Error ? error.message : String(error));
		}
	}
	return { loaded: false, file, reason: reasons.join("; ") };
}
