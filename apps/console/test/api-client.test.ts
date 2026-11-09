import { afterEach, describe, expect, test } from "bun:test";
import { z } from "zod";

import { ApiError } from "@/lib/api/api-error";
import { api } from "@/lib/api/client";
import { getSession, setSession } from "@/lib/api/session";

import { API, failure, mockFetch, ok, signedIn } from "./helpers";

const item = z.object({ id: z.string() });

afterEach(() => setSession(null));

describe("api client", () => {
	test("sends JSON with the bearer token and returns validated data", async () => {
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

	test("a 401 refreshes once, retries with the new token, and stores the rotated tokens", async () => {
		signedIn("old-access", "refresh-1");
		const calls = mockFetch((call) => {
			if (call.url.endsWith("/auth/refresh")) {
				return ok({ tokenType: "Bearer", accessToken: "new-access", refreshToken: "refresh-2" });
			}
			return call.headers.get("authorization") === "Bearer new-access"
				? ok({ id: "d1" })
				: failure(401, "AUTH_ACCESS_TOKEN_INVALID", "expired");
		});
		// Two requests at once: one refresh (refresh tokens are single-use).
		const results = await Promise.all([api("/a", { schema: item }), api("/b", { schema: item })]);

		expect(results).toEqual([{ id: "d1" }, { id: "d1" }]);
		expect(calls.filter((call) => call.url.endsWith("/auth/refresh"))).toHaveLength(1);
		expect(calls.find((call) => call.url.endsWith("/auth/refresh"))?.body).toEqual({
			refreshToken: "refresh-1",
		});
		expect(getSession()).toEqual({ accessToken: "new-access", refreshToken: "refresh-2" });
		expect(JSON.parse(sessionStorage.getItem("synapse.session") ?? "{}")).toMatchObject({
			refreshToken: "refresh-2",
		});
	});

	test("a failed refresh signs out and surfaces the 401", async () => {
		signedIn();
		mockFetch((call) =>
			call.url.endsWith("/auth/refresh")
				? failure(401, "AUTH_REFRESH_TOKEN_INVALID", "Session expired")
				: failure(401, "AUTH_ACCESS_TOKEN_INVALID", "expired"),
		);
		await expect(api("/x", { schema: item })).rejects.toMatchObject({ status: 401 });
		expect(getSession()).toBeNull();
	});

	test("sign-in style calls send no token and never try to refresh", async () => {
		signedIn();
		const calls = mockFetch(() =>
			failure(401, "AUTH_INVALID_CREDENTIALS", "Email or password is incorrect"),
		);
		await expect(
			api("/auth/sign-in", { method: "POST", body: {}, auth: false, schema: item }),
		).rejects.toMatchObject({
			message: "Email or password is incorrect",
		});
		expect(calls).toHaveLength(1);
		expect(calls[0]?.headers.get("authorization")).toBeNull();
	});
});
