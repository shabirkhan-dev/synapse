import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import { Markdown } from "@/components/shared/markdown";

afterEach(cleanup);

describe("Markdown", () => {
	test("renders the model's formatting: emphasis, lists, code and tables", () => {
		render(
			<Markdown
				text={[
					"Refunds are **within 30 days**.",
					"",
					"- unused gear",
					"- original packaging",
					"",
					"Use `RMA-123`.",
					"",
					"| Plan | Days |",
					"| --- | --- |",
					"| Standard | 30 |",
				].join("\n")}
			/>,
		);
		expect(screen.getByText("within 30 days").tagName).toBe("STRONG");
		expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
			"unused gear",
			"original packaging",
		]);
		expect(screen.getByText("RMA-123").tagName).toBe("CODE");
		expect(screen.getByRole("cell", { name: "Standard" })).toBeDefined();
		expect(screen.queryByText(/\*\*/)).toBeNull();
	});

	test("only web links are followed, in a new tab without the opener; other schemes stay text", () => {
		render(
			<Markdown text="See [the policy](https://example.com/p) or [this](javascript:alert(1)) or [mail](mailto:a@b.c)." />,
		);
		const link = screen.getByRole("link", { name: "the policy" });
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
		expect(link.getAttribute("target")).toBe("_blank");
		expect(screen.getAllByRole("link")).toHaveLength(1);
		expect(screen.getByText(/this/)).toBeDefined();
	});

	test("known citations become source links; raw HTML is shown as text, never rendered", () => {
		render(
			<Markdown
				text={"No, opened stoves cannot be returned [1][2]. <script>alert(1)</script> [9]"}
				citations={new Set([1, 2])}
			/>,
		);
		expect(screen.getByRole("link", { name: "Source 1" }).getAttribute("href")).toBe("#citation-1");
		expect(screen.getByRole("link", { name: "Source 2" })).toBeDefined();
		expect(screen.queryByRole("link", { name: "Source 9" })).toBeNull();
		expect(document.querySelector("script")).toBeNull();
		expect(screen.getByText(/<script>/)).toBeDefined();
	});
});
