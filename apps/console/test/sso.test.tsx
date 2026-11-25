import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";

import type { SsoConnection } from "@/features/organizations/types/organization.types";

const replace = mock();
// No Next router runs under happy-dom.
mock.module("next/navigation", () => ({
	useRouter: () => ({ replace, push: mock(), back: mock() }),
	usePathname: () => "/sso",
	useSearchParams: () => new URLSearchParams(),
}));

const { SsoCallbackContainer } = await import("@/features/auth");
const { SsoForm } = await import("@/features/auth/components/sso-form");
const { SsoSettings } = await import("@/features/organizations/components/sso-settings");
const { getAccessToken, setAccessToken } = await import("@/lib/api/session");
const { failure, mockFetch, ok, renderWithQuery } = await import("./helpers");

afterEach(() => {
	cleanup();
	setAccessToken(null);
	replace.mockClear();
});

const signedIn = {
	user: {
		id: "u1",
		email: "ada@acme.test",
		emailVerifiedAt: "2026-11-25T10:00:00Z",
		createdAt: "2026-11-25T10:00:00Z",
	},
	tokens: {
		tokenType: "Bearer",
		accessToken: "sso-access",
		accessTokenExpiresAt: "2026-11-25T10:15:00Z",
		refreshTokenExpiresAt: "2026-12-25T10:00:00Z",
	},
};

const connection: SsoConnection = {
	issuer: "https://login.acme.test",
	clientId: "synapse",
	hasClientSecret: true,
	defaultRole: "member",
	redirectUri: "http://localhost:3000/sso/callback",
	dnsRecord: { name: "_synapse-verification", value: "synapse-verification=abc" },
	domains: [
		{ domain: "acme.test", verifiedAt: "2026-11-25T10:00:00Z" },
		{ domain: "acme.dev", verifiedAt: null },
	],
	updatedAt: "2026-11-25T10:00:00Z",
};

describe("SsoForm", () => {
	test("asks for a work email before going anywhere", () => {
		const onSubmit = mock();
		render(<SsoForm onSubmit={onSubmit} pending={false} error={null} />);
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		expect(screen.getByText("Enter your work email")).toBeDefined();
		fireEvent.change(screen.getByLabelText("Work email"), { target: { value: " ada@acme.test " } });
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		expect(onSubmit).toHaveBeenCalledWith("ada@acme.test");
	});
});

describe("SsoCallbackContainer (mocked API)", () => {
	test("spends the code once, keeps the access token in memory, then opens the workspace", async () => {
		const calls = mockFetch(() => ok(signedIn));
		renderWithQuery(
			<StrictMode>
				<SsoCallbackContainer code="the-code" state="the-state" providerError={null} />
			</StrictMode>,
		);
		await waitFor(() => expect(replace).toHaveBeenCalledWith("/documents"));
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toEndWith("/auth/sso/callback");
		expect(calls[0]?.body).toEqual({ code: "the-code", state: "the-state", session: "cookie" });
		expect(getAccessToken()).toBe("sso-access");
		expect(window.location.search).toBe("");
	});

	test("a refused sign-in shows why, with ways to start again", async () => {
		mockFetch(() => failure(400, "SSO_STATE_INVALID", "This sign-in expired or was already used"));
		renderWithQuery(<SsoCallbackContainer code="c" state="s" providerError={null} />);
		await screen.findByText("This sign-in expired or was already used");
		expect(screen.getByRole("link", { name: "Try single sign-on again" })).toBeDefined();
		expect(screen.getByRole("link", { name: "Sign in with a password" })).toBeDefined();
	});

	test("the provider's own error is shown and nothing is sent", () => {
		const calls = mockFetch(() => ok(signedIn));
		renderWithQuery(
			<SsoCallbackContainer code={null} state="s" providerError="User cancelled the sign-in" />,
		);
		expect(screen.getByText(/User cancelled the sign-in/)).toBeDefined();
		expect(calls).toHaveLength(0);
	});
});

describe("SsoSettings", () => {
	const handlers = () => ({ onSave: mock(), onCheck: mock(), onRemove: mock() });

	test("owners see each domain's state, the DNS record and the callback URL", () => {
		const props = handlers();
		render(
			<SsoSettings
				connection={connection}
				canEdit
				saving={false}
				checking={false}
				removing={false}
				{...props}
			/>,
		);
		const domains = screen.getByRole("list", { name: "Domains" });
		expect(domains.textContent).toContain("acme.testVerified");
		expect(domains.textContent).toContain("acme.devWaiting for DNS");
		expect(screen.getByText("synapse-verification=abc")).toBeDefined();
		expect(screen.getByText("http://localhost:3000/sso/callback")).toBeDefined();
		expect((screen.getByLabelText("Client secret") as HTMLInputElement).placeholder).toContain(
			"leave empty to keep it",
		);
		fireEvent.click(screen.getByRole("button", { name: "Check DNS records" }));
		expect(props.onCheck).toHaveBeenCalled();
	});

	test("saving splits the domains and checks them first", () => {
		const props = handlers();
		render(
			<SsoSettings
				connection={null}
				canEdit
				saving={false}
				checking={false}
				removing={false}
				{...props}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Issuer URL"), {
			target: { value: "https://login.acme.test" },
		});
		fireEvent.change(screen.getByLabelText("Client ID"), { target: { value: "synapse" } });
		fireEvent.change(screen.getByLabelText("Sign-in domains"), {
			target: { value: "acme.test, nope" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Set up" }));
		expect(screen.getByText("Use domains such as example.com")).toBeDefined();
		expect(props.onSave).not.toHaveBeenCalled();

		fireEvent.change(screen.getByLabelText("Sign-in domains"), {
			target: { value: "Acme.test,\nacme.dev" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Set up" }));
		expect(props.onSave).toHaveBeenCalledWith({
			issuer: "https://login.acme.test",
			clientId: "synapse",
			clientSecret: "",
			domains: ["acme.test", "acme.dev"],
			defaultRole: "member",
		});
	});

	test("turning it off asks first; admins only read", () => {
		const props = handlers();
		const { rerender } = render(
			<SsoSettings
				connection={connection}
				canEdit
				saving={false}
				checking={false}
				removing={false}
				{...props}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Turn off…" }));
		expect(props.onRemove).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Turn off single sign-on" }));
		expect(props.onRemove).toHaveBeenCalled();

		rerender(
			<SsoSettings
				connection={connection}
				canEdit={false}
				saving={false}
				checking={false}
				removing={false}
				{...props}
			/>,
		);
		expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
		expect(screen.getByText(/Only owners change these settings/)).toBeDefined();
	});
});
