import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AccountContainer } from "@/features/account";
import { EmailStatus } from "@/features/account/components/email-status";
import { SessionsList } from "@/features/account/components/sessions-list";
import { describeUserAgent } from "@/features/account/utils/describe-user-agent";
import { formatRelative } from "@/features/account/utils/format-relative";
import { setAccessToken } from "@/lib/api/session";

import { type Call, failure, mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

afterEach(() => {
	cleanup();
	setAccessToken(null);
});

const FIREFOX_MAC =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:140.0) Gecko/20100101 Firefox/140.0";
const SAFARI_IPHONE =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const CHROME_WIN =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const EDGE_WIN = `${CHROME_WIN} Edg/141.0.0.0`;

const session = (id: string, userAgent: string | null, current = false) => ({
	id,
	userAgent,
	createdAt: "2026-11-01T10:00:00Z",
	lastActiveAt: new Date(Date.now() - 5 * 60_000).toISOString(),
	expiresAt: "2026-12-01T10:00:00Z",
	current,
});

const is = (call: Call, method: string, end: string) =>
	call.method === method && call.url.endsWith(end);

const me = (verified: boolean) => ({
	id: "u1",
	email: "ada@example.com",
	emailVerifiedAt: verified ? "2026-11-02T10:00:00Z" : null,
	organization: { id: "u1", role: "owner" },
});

describe("describeUserAgent", () => {
	test("names the browser and system", () => {
		expect(describeUserAgent(FIREFOX_MAC)).toBe("Firefox on macOS");
		expect(describeUserAgent(SAFARI_IPHONE)).toBe("Safari on iOS");
		expect(describeUserAgent(CHROME_WIN)).toBe("Chrome on Windows");
		expect(describeUserAgent(EDGE_WIN)).toBe("Edge on Windows");
		expect(describeUserAgent("curl/8.5.0")).toBe("curl");
		expect(describeUserAgent(null)).toBe("Unknown device");
	});
});

describe("formatRelative", () => {
	test("says how long ago in words", () => {
		const now = Date.parse("2026-11-12T12:00:00Z");
		expect(formatRelative("2026-11-12T11:59:40Z", now)).toBe("just now");
		expect(formatRelative("2026-11-12T11:55:00Z", now)).toBe("5 minutes ago");
		expect(formatRelative("2026-11-11T12:00:00Z", now)).toBe("yesterday");
	});
});

describe("SessionsList", () => {
	test("lists this device first without a sign-out, others with one, and confirms signing out the rest", async () => {
		const onRevoke = mock();
		const onRevokeOthers = mock();
		const sessions = [
			session("s2", SAFARI_IPHONE),
			session("s1", FIREFOX_MAC, true),
			session("s3", CHROME_WIN),
		];
		render(
			<SessionsList
				sessions={sessions}
				revokingId={null}
				revokingOthers={false}
				onRevoke={onRevoke}
				onRevokeOthers={onRevokeOthers}
			/>,
		);
		const items = screen.getAllByRole("listitem");
		expect(items[0]?.textContent).toContain("Firefox on macOS");
		expect(items[0]?.textContent).toContain("This device");
		for (const item of items) expect(item.textContent).toContain("active 5 minutes ago");
		expect(screen.getAllByRole("button", { name: /^Sign out .* signed in / })).toHaveLength(2);

		fireEvent.click(screen.getByRole("button", { name: /^Sign out Safari on iOS/ }));
		expect(onRevoke).toHaveBeenCalledWith(sessions[0]);

		fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere else" }));
		expect(onRevokeOthers).not.toHaveBeenCalled();
		expect(await screen.findByText("Sign out 2 other devices?")).toBeDefined();
		fireEvent.click(screen.getByRole("button", { name: "Sign out 2 other devices" }));
		expect(onRevokeOthers).toHaveBeenCalled();
	});

	test("offers nothing to sign out when this is the only device", () => {
		render(
			<SessionsList
				sessions={[session("s1", FIREFOX_MAC, true)]}
				revokingId={null}
				revokingOthers={false}
				onRevoke={mock()}
				onRevokeOthers={mock()}
			/>,
		);
		expect(screen.queryByRole("button")).toBeNull();
	});
});

describe("EmailStatus", () => {
	test("unverified: says so in words and offers a new link", () => {
		const onResend = mock();
		render(
			<EmailStatus
				email="ada@example.com"
				verifiedAt={null}
				sending={false}
				sent={false}
				error={null}
				onResend={onResend}
			/>,
		);
		expect(screen.getByText("Not verified")).toBeDefined();
		fireEvent.click(screen.getByRole("button", { name: "Send a new link" }));
		expect(onResend).toHaveBeenCalled();
	});

	test("verified: shows the date and no resend", () => {
		render(
			<EmailStatus
				email="ada@example.com"
				verifiedAt="2026-11-02T10:00:00Z"
				sending={false}
				sent={false}
				error={null}
				onResend={mock()}
			/>,
		);
		expect(screen.getByText("Verified")).toBeDefined();
		expect(screen.getByText("Nov 2, 2026")).toBeDefined();
		expect(screen.queryByRole("button")).toBeNull();
	});
});

describe("AccountContainer (mocked API)", () => {
	test("signs out another device and the list refreshes", async () => {
		signedIn();
		let sessions = [session("s1", FIREFOX_MAC, true), session("s2", SAFARI_IPHONE)];
		const calls = mockFetch((call) => {
			if (call.url.endsWith("/auth/me")) return ok(me(true));
			if (is(call, "DELETE", "/auth/sessions/s2")) {
				sessions = sessions.slice(0, 1);
				return ok(null);
			}
			return ok(sessions);
		});
		renderWithQuery(<AccountContainer />);
		fireEvent.click(await screen.findByRole("button", { name: /^Sign out Safari on iOS/ }));
		await waitFor(() => expect(screen.queryByText("Safari on iOS")).toBeNull());
		expect(calls.some((call) => is(call, "DELETE", "/auth/sessions/s2"))).toBe(true);
	});

	test("sends a new verification link; a refusal shows the API's reason", async () => {
		signedIn();
		let attempts = 0;
		mockFetch((call) => {
			if (call.url.endsWith("/auth/me")) return ok(me(false));
			if (is(call, "POST", "/auth/verify-email/resend")) {
				attempts += 1;
				return attempts === 1
					? ok(null, 202)
					: failure(429, "AUTH_RATE_LIMITED", "Too many attempts; try again later");
			}
			return ok([session("s1", FIREFOX_MAC, true)]);
		});
		renderWithQuery(<AccountContainer />);
		fireEvent.click(await screen.findByRole("button", { name: "Send a new link" }));
		await screen.findByText("Sent. Check ada@example.com for the new link.");
		fireEvent.click(screen.getByRole("button", { name: "Send a new link" }));
		await screen.findByText("Too many attempts; try again later");
	});
});
