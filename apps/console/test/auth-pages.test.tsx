import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { VerifyEmailContainer } from "@/features/auth";

import { failure, mockFetch, ok, renderWithQuery } from "./helpers";

afterEach(cleanup);

const typeInto = (label: string, value: string) =>
	fireEvent.change(screen.getByLabelText(label), { target: { value } });
const longPassword = "correct-horse-battery";

describe("SignUpForm", () => {
	test("enforces the password policy and a matching repeat before submitting", () => {
		const onSubmit = mock();
		render(<SignUpForm onSubmit={onSubmit} pending={false} error={null} />);
		typeInto("Email", "ada@example.com");
		typeInto("Password", "short");
		typeInto("Repeat the password", "short");
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));
		expect(screen.getByText("Use at least 12 characters")).toBeDefined();

		typeInto("Password", longPassword);
		typeInto("Repeat the password", `${longPassword}!`);
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));
		expect(screen.getByText("The passwords do not match")).toBeDefined();
		expect(onSubmit).not.toHaveBeenCalled();

		typeInto("Repeat the password", longPassword);
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));
		expect(onSubmit).toHaveBeenCalledWith({
			email: "ada@example.com",
			password: longPassword,
			confirm: longPassword,
		});
	});
});

describe("ForgotPasswordForm", () => {
	test("after sending, says the same thing whether or not the address has an account", () => {
		render(<ForgotPasswordForm onSubmit={() => {}} pending={false} error={null} sent />);
		expect(screen.getByText(/If that address has an account/)).toBeDefined();
		expect(screen.getByRole("button", { name: "Send another link" })).toBeDefined();
	});
});

describe("ResetPasswordForm", () => {
	test("submits only the new password once both entries match", () => {
		const onSubmit = mock();
		render(
			<ResetPasswordForm
				onSubmit={onSubmit}
				pending={false}
				error={null}
				done={false}
				missingToken={false}
			/>,
		);
		typeInto("New password", longPassword);
		typeInto("Repeat the new password", longPassword);
		fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
		expect(onSubmit).toHaveBeenCalledWith(longPassword);
	});

	test("a link without a token and a finished reset show no form", () => {
		const { rerender } = render(
			<ResetPasswordForm
				onSubmit={() => {}}
				pending={false}
				error={null}
				done={false}
				missingToken
			/>,
		);
		expect(screen.getByText("This link is incomplete")).toBeDefined();
		expect(screen.queryByLabelText("New password")).toBeNull();
		rerender(
			<ResetPasswordForm
				onSubmit={() => {}}
				pending={false}
				error={null}
				done
				missingToken={false}
			/>,
		);
		expect(screen.getByText("Password changed")).toBeDefined();
		expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in");
	});
});

describe("VerifyEmailContainer (mocked API)", () => {
	test("spends the single-use token once, even under StrictMode's double effects", async () => {
		const calls = mockFetch(() =>
			ok({ id: "u1", email: "ada@example.com", emailVerifiedAt: "2026-11-09T10:00:00Z" }),
		);
		renderWithQuery(
			<StrictMode>
				<VerifyEmailContainer token="link-token" />
			</StrictMode>,
		);
		await screen.findByText("Email verified");
		expect(screen.getByText(/ada@example.com is confirmed/)).toBeDefined();
		expect(calls).toHaveLength(1);
		expect(calls[0]?.body).toEqual({ token: "link-token" });
		expect(calls[0]?.headers.get("authorization")).toBeNull();
	});

	test("an expired link shows the API's reason; no token means no call", async () => {
		const calls = mockFetch(() =>
			failure(400, "AUTH_LINK_INVALID", "This link is invalid or has expired"),
		);
		renderWithQuery(<VerifyEmailContainer token="old" />);
		await screen.findByText("This link is invalid or has expired");
		cleanup();
		renderWithQuery(<VerifyEmailContainer token={null} />);
		await waitFor(() => expect(screen.getByText("The link has no token in it.")).toBeDefined());
		expect(calls).toHaveLength(1);
	});
});
