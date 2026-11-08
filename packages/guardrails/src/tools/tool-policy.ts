/**
 * Which tools a model may call. Anything not listed is removed before the model sees the tool set,
 * so model output can never reach an unlisted (e.g. privileged) action.
 */
export function createToolPolicy(allowed: readonly string[]) {
	const names = new Set(allowed);
	return {
		allows: (name: string) => names.has(name),
		/** Keep only allowed tools; `removed` names what was dropped (for logs and tests). */
		filter<TTools extends Record<string, unknown>>(
			tools: TTools,
		): { tools: Partial<TTools>; removed: string[] } {
			const kept: Partial<TTools> = {};
			const removed: string[] = [];
			for (const [name, tool] of Object.entries(tools)) {
				if (names.has(name)) {
					kept[name as keyof TTools] = tool as TTools[keyof TTools];
				} else {
					removed.push(name);
				}
			}
			return { tools: kept, removed };
		},
	};
}

export type ToolPolicy = ReturnType<typeof createToolPolicy>;
