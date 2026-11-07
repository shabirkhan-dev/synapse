// Tests assert on JSON bodies directly; let Response#json() return `any` here only (src keeps `unknown`).
declare global {
	interface Response {
		json<T = any>(): Promise<T>;
	}
}

export type TestJsonBody = unknown;
