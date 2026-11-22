import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AccountMenu } from "@/components/layout/account-menu";
import { ThemeProvider } from "@/providers/theme-provider";

/** Base UI menu items act on the pointer sequence a real click makes, not on a bare click event. */
function press(element: HTMLElement) {
	fireEvent.pointerDown(element);
	fireEvent.mouseDown(element);
	fireEvent.pointerUp(element);
	fireEvent.mouseUp(element);
	fireEvent.click(element);
}

afterEach(() => {
	cleanup();
	localStorage.clear();
	document.documentElement.className = "";
});

describe("AccountMenu", () => {
	test("shows you; its menu sets the theme, links to the account and signs out", async () => {
		const onSignOut = mock();
		render(
			<ThemeProvider>
				<AccountMenu
					email="maya@example.com"
					signingOut={false}
					onSignOut={onSignOut}
					onNavigate={() => {}}
				/>
			</ThemeProvider>,
		);
		expect(screen.getByText("maya")).toBeDefined();
		expect(screen.getByRole("link", { name: "Account settings" }).getAttribute("href")).toBe(
			"/account",
		);

		fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
		press(await screen.findByRole("menuitem", { name: "Sign out" }));
		expect(onSignOut).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
		press(await screen.findByRole("menuitemradio", { name: "Dark" }));
		await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
		expect(localStorage.getItem("theme")).toBe("dark");
	});
});
