import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { ThemeProvider } from "@/providers/theme-provider";

afterEach(() => {
	cleanup();
	localStorage.clear();
	document.documentElement.className = "";
});

describe("ThemeSwitcher", () => {
	test("Light, Dark and System are one radio group; choosing one sets the theme and remembers it", async () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher />
			</ThemeProvider>,
		);
		const group = screen.getByRole("radiogroup", { name: "Theme" });
		expect(group).toBeDefined();
		await waitFor(() =>
			expect(screen.getByRole("radio", { name: "System" }).getAttribute("aria-checked")).toBe(
				"true",
			),
		);

		fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
		await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
		expect(screen.getByRole("radio", { name: "Dark" }).getAttribute("aria-checked")).toBe("true");
		expect(localStorage.getItem("theme")).toBe("dark");

		fireEvent.click(screen.getByRole("radio", { name: "Light" }));
		await waitFor(() => expect(document.documentElement.classList.contains("light")).toBe(true));
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});
});
