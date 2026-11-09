/** `synapse-bindings.<platform>-<arch>[-musl].node`, e.g. `synapse-bindings.linux-x64.node`. */
export function bindingFileName(
	platform: string = process.platform,
	arch: string = process.arch,
	musl: boolean = isMusl(),
): string {
	return `synapse-bindings.${platform}-${arch}${musl ? "-musl" : ""}.node`;
}

/** Alpine and other musl systems report no glibc version. */
function isMusl(): boolean {
	if (process.platform !== "linux") return false;
	const report = process.report?.getReport() as
		| { header?: { glibcVersionRuntime?: string } }
		| undefined;
	return !report?.header?.glibcVersionRuntime;
}
