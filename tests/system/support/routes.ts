import { SYSTEM } from "./env";

export type Route = { method: string; path: string; isProtected: boolean };

type OpenApi = { paths: Record<string, Record<string, { security?: unknown[] }>> };

const BASE_PATH = "/api/v1";
const ANY_ID = "00000000-0000-4000-8000-000000000000";

/** Every route in the API's own OpenAPI document, path parameters filled with a fixed id. */
export async function listRoutes(): Promise<Route[]> {
	const response = await fetch(new URL("/api/openapi.json", SYSTEM.apiUrl));
	const document = (await response.json()) as OpenApi;
	return Object.entries(document.paths).flatMap(([path, operations]) =>
		Object.entries(operations).map(([method, operation]) => ({
			method: method.toUpperCase(),
			path: path.replace(BASE_PATH, "").replaceAll(/\{[^}]+\}/g, ANY_ID),
			isProtected: Boolean(operation.security?.length),
		})),
	);
}
