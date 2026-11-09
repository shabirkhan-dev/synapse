import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { bindingFileName } from "../src/binding-name";

/**
 * `bun run build:native`: compile `crates/bindings` (release) and copy the shared library to
 * `packages/native/bin/<binding file>` where the loader looks for it.
 */
const root = fileURLToPath(new URL("../../../", import.meta.url));
const built = Bun.spawnSync(["cargo", "build", "--release", "-p", "synapse-bindings"], {
	cwd: root,
	stdout: "inherit",
	stderr: "inherit",
});
if (built.exitCode !== 0) process.exit(built.exitCode ?? 1);

const library =
	{
		darwin: "libsynapse_bindings.dylib",
		win32: "synapse_bindings.dll",
	}[process.platform as "darwin" | "win32"] ?? "libsynapse_bindings.so";
const binDir = fileURLToPath(new URL("../bin/", import.meta.url));
mkdirSync(binDir, { recursive: true });
const target = `${binDir}${bindingFileName()}`;
copyFileSync(`${root}target/release/${library}`, target);
console.info(`native binding: ${target}`);
