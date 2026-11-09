import { afterEach, describe, expect, test } from "bun:test";
import { z } from "zod";

import { ApiError } from "@/lib/api/api-error";
import { api } from "@/lib/api/client";
import { getAccessToken, getSessionStatus, setAccessToken } from "@/lib/api/session";

import { API, failure, mockFetch, ok, signedIn } from "./helpers";

const item = z.object({ id: z.string() });

afterEach(() => setAccessToken(null));

describe("api client", () => {
	test("sends JSON with the bearer token and credentials, and returns validated data", async () => {
		signedIn();
		const calls = mockFetch(() => ok({ id: "d1", extra: true }, 201));
		const data = await api("/rag/documents", {
			method: "POST",
			body: { title: "t" },
			schema: item,
		});

		expect(data).toEqual({ id: "d1" });
		expect(calls[0]).toMatchObject({
			url: `${API}/rag/documents`,
			method: "POST",
			body: { title: "t" },
			credentials: "include",
		});
		expect(calls[0]?.headers.get("authorization")).toBe("Bearer access-1");
		expect(calls[0]?.headers.get("content-type")).toBe("application/json");
	});

	test("an error envelope becomes ApiError with the API's code and message", async () => {
		mockFetch(() => failure(422, "VALIDATION_ERROR", "Request validation failed"));
		const error = await api("/x", { schema: item }).catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({
			status: 422,
			code: "VALIDATION_ERROR",
			message: "Request validation failed",
		});
	});

	test("a response that does not match the schema is rejected", async () => {
		mockFetch(() => ok({ nope: 1 }));
		await expect(api("/x", { schema: item })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
	});

	test("an unreachable API is a NETWORK_ERROR", async () => {
		mockFetch(() => {
			throw new TypeError("fetch failed");
		});
		await expect(api("/x", { schema: item })).rejects.toMatchObject({
			status: 0,
			code: "NETWORK_ERROR",
		});
	});

	test("a 401 refreshes once from the cookie (no token in the body) and retries", async () => {
		signedIn("old-access");
		const calls = mockFetch((call) => {
			if (call.url.endsWith("/auth/refresh")) {
				return ok({ tokenType: "Bearer", accessToken: "new-access" });
			}
			return call.headers.get("authorization") === "Bearer new-access"
				? ok({ id: "d1" })
				: failure(401, "AUTH_ACCESS_TOKEN_INVALID", "expired");
		});
		// Two requests at once: one refresh (refresh tokens are single-use).
		const results = await Promise.all([api("/a", { schema: item }), api("/b", { schema: item })]);

		expect(results).toEqual([{ id: "d1" }, { id: "d1" }]);
		const refreshes = calls.filter((call) => call.url.endsWith("/auth/refresh"));
		expect(refreshes).toHaveLength(1);
		expect(refreshes[0]).toMatchObject({ method: "POST", body: {}, credentials: "include" });
		expect(refreshes[0]?.headers.get("authorization")).toBeNull();
		expect(getAccessToken()).toBe("new-access");
	});

	test("a failed refresh signs out and surfaces the 401", async () => {
		signedIn();
		mockFetch((call) =>
			call.url.endsWith("/auth/refresh")
				? failure(401, "AUTH_REFRESH_TOKEN_INVALID", "Session expired")
				: failure(401, "AUTH_ACCESS_TOKEN_INVALID", "expired"),
		);
		await expect(api("/x", { schema: item })).rejects.toMatchObject({ status: 401 });
		expect(getSessionStatus()).toBe("signed-out");
		expect(getAccessToken()).toBeNull();
	});

	test("an unreachable API during refresh keeps a signed-in tab signed in", async () => {
		signedIn();
		mockFetch((call) => {
			if (call.url.endsWith("/auth/refresh")) throw new TypeError("fetch failed");
			return failure(401, "AUTH_ACCESS_TOKEN_INVALID", "expired");
		});
		await expect(api("/x", { schema: item })).rejects.toMatchObject({ status: 401 });
		expect(getSessionStatus()).toBe("signed-in");
	});

	test("sign-in style calls send no token and never try to refresh", async () => {
		signedIn();
		const calls = mockFetch(() =>
			failure(401, "AUTH_INVALID_CREDENTIALS", "Email or password is incorrect"),
		);
		await expect(
			api("/auth/sign-in", { method: "POST", body: {}, auth: false, schema: item }),
		).rejects.toMatchObject({ message: "Email or password is incorrect" });
		expect(calls).toHaveLength(1);
		expect(calls[0]?.headers.get("authorization")).toBeNull();
	});

	test("nothing is written to web storage", async () => {
		signedIn("secret-access");
		expect(JSON.stringify({ ...sessionStorage, ...localStorage })).not.toContain("secret-access");
	});
});
