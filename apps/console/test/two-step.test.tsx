import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { failure, mockFetch, ok, renderWithQuery } from "./helpers";

mock.module("next/navigation", () => ({
	useRouter: () => ({ replace: mock(), push: mock(), back: mock() }),
	usePathname: () => "/sign-in",
	useSearchParams: () => new URLSearchParams(),
}));

const { SignInContainer } = await import("@/features/auth");
const { TwoStepCard } = await import("@/features/account/components/two-step-card");
const { getAccessToken, setAccessToken } = await import("@/lib/api/session");

afterEach(() => {
	cleanup();
	setAccessToken(null);
});

const user = {
	id: "u1",
	email: "ada@example.com",
	emailVerifiedAt: null,
	createdAt: "2026-11-21T10:00:00Z",
};

describe("sign-in with two-step sign-in on", () => {
	test("the password step asks for a code; the code finishes sign-in; a wrong one says so", async () => {
		const calls = mockFetch((call) => {
			if (call.url.endsWith("/auth/sign-in"))
				return ok({ mfaRequired: true, challenge: "challenge-1" });
			if (call.url.endsWith("/auth/sign-in/mfa")) {
				const { code } = call.body as { code: string };
				if (code !== "123456")
					return failure(
						401,
						"AUTH_MFA_CODE_INVALID",
						"That code is not right, or was already used; try the newest one",
					);
				return ok({ user, tokens: { accessToken: "access-1" } });
			}
			return failure(401, "AUTH_REFRESH_TOKEN_INVALID", "No session");
		});
		renderWithQuery(<SignInContainer />);
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
		fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a long passphrase" } });
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		await screen.findByText("Enter the 6-digit code from your authenticator app.");
		expect(getAccessToken()).toBeNull();
		fireEvent.change(screen.getByLabelText("Authentication code"), { target: { value: "000000" } });
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		await screen.findByText("That code is not right, or was already used; try the newest one");

		fireEvent.change(screen.getByLabelText("Authentication code"), { target: { value: "123456" } });
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		await waitFor(() => expect(getAccessToken()).toBe("access-1"));
		const second = calls.findLast((call) => call.url.endsWith("/auth/sign-in/mfa"));
		expect(second?.body).toEqual({ challenge: "challenge-1", code: "123456", session: "cookie" });
	});

	test("a recovery code can be used instead, and Start over goes back to the password", async () => {
		mockFetch(() => ok({ mfaRequired: true, challenge: "c" }));
		renderWithQuery(<SignInContainer />);
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
		fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a long passphrase" } });
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
		await screen.findByLabelText("Authentication code");
		fireEvent.click(screen.getByRole("button", { name: "Use a recovery code" }));
		expect(screen.getByLabelText("Recovery code")).toBeDefined();
		fireEvent.click(screen.getByRole("button", { name: "Start over" }));
		expect(screen.getByLabelText("Password")).toBeDefined();
	});
});

describe("TwoStepCard", () => {
	const noop = async () => {};
	test("off: offers set-up; set-up: the key and a code to confirm; on: codes left and turn off", async () => {
		const onConfirm = mock(async () => {});
		const props = {
			recoveryCodes: null,
			pending: false,
			error: null,
			onStart: () => {},
			onConfirm,
			onCancel: () => {},
			onDisable: noop,
			onDoneWithCodes: () => {},
		};
		const { rerender } = render(
			<TwoStepCard {...props} status={{ enabled: false, recoveryCodesLeft: 0 }} setup={null} />,
		);
		expect(screen.getByRole("button", { name: "Set up two-step sign-in" })).toBeDefined();

		rerender(
			<TwoStepCard
				{...props}
				status={{ enabled: false, recoveryCodesLeft: 0 }}
				setup={{
					secret: "JBSWY3DPEHPK3PXP",
					uri: "otpauth://totp/Synapse:ada?secret=JBSWY3DPEHPK3PXP",
				}}
			/>,
		);
		expect(screen.getByText("JBSW Y3DP EHPK 3PXP")).toBeDefined();
		fireEvent.change(screen.getByLabelText("Code from the app"), { target: { value: "123456" } });
		fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
		await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("123456"));

		rerender(
			<TwoStepCard
				{...props}
				status={{ enabled: true, recoveryCodesLeft: 10 }}
				setup={null}
				recoveryCodes={["abcde-fghjk", "mnpqr-stuvw"]}
			/>,
		);
		expect(
			screen.getByText("Save these recovery codes now: they are not shown again"),
		).toBeDefined();
		expect(screen.getByText("abcde-fghjk")).toBeDefined();
		expect(screen.getByText(/10 recovery codes left/)).toBeDefined();
		expect(screen.getByRole("button", { name: "Turn off" })).toBeDefined();
	});
});
