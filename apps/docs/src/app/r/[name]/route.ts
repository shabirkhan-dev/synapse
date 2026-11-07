import { readRegistryFile, registryOrigin } from "@/lib/registry";

/**
 * The shadcn registry: `/r/registry.json` (the catalog) and `/r/<item>.json`, for
 * `npx shadcn@latest add <docs>/r/button.json` or a `@rabtx` namespace in components.json.
 */
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
	const { name } = await params;
	const body = await readRegistryFile(name, registryOrigin(request.url));
	if (!body) {
		return Response.json({ error: `Registry item "${name}" was not found.` }, { status: 404 });
	}
	return new Response(body, {
		headers: {
			"content-type": "application/json; charset=utf-8",
			"access-control-allow-origin": "*",
			"cache-control": "public, max-age=300",
		},
	});
}
