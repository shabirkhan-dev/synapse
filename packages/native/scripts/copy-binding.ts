import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { bindingFileName } from "../src/binding-name";

/**
 * `bun copy-binding.ts <dir>`: copy this platform's built binding next to an app bundle, if it was
 * built. Without one the bundle still works on the TypeScript fallback, so this never fails.
 */
const [target] = process.argv.slice(2);
if (!target) throw new Error("usage: bun copy-binding.ts <bundle bin dir>");
const file = bindingFileName();
const source = fileURLToPath(new URL(`../bin/${file}`, import.meta.url));
if (existsSync(source)) {
	mkdirSync(target, { recursive: true });
	copyFileSync(source, `${target}/${file}`);
	console.info(`native binding copied: ${target}/${file}`);
} else {
	console.info(
		"no native binding built (bun run build:native): bundle uses the TypeScript fallback",
	);
}
