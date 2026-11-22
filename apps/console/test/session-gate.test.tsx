import { describe, expect, mock, test } from "bun:test";
import { render, screen } from "@testing-library/react";

mock.module("next/navigation", () => ({
	useRouter: () => ({ replace: mock(), push: mock(), back: mock() }),
	usePathname: () => "/documents",
	useSearchParams: () => new URLSearchParams(),
}));

const { AppShell } = await import("@/components/layout/app-shell");

// The gate renders this while the cookie refresh is pending (the e2e holds a real refresh open).
describe("AppShell while the session is restored", () => {
	test("shows the pages and a page outline instead of the page", () => {
		render(
			<AppShell email={null} pending signingOut={false} onSignOut={() => {}}>
				<h1>Documents page</h1>
			</AppShell>,
		);
		expect(screen.getByRole("navigation", { name: "Main" })).toBeDefined();
		expect(screen.getByRole("link", { name: "Chat" })).toBeDefined();
		expect(screen.getByRole("status").textContent).toBe("Loading your workspace…");
		expect(screen.queryByText("Documents page")).toBeNull();
		expect(screen.queryByRole("button", { name: "Account menu" })).toBeNull();
	});
});
