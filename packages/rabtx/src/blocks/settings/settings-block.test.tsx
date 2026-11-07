import { readdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsBlock } from "./settings-block";
import { escapePattern } from "./settings-dialogs";
import { settingsParts } from "./settings.styles";
import {
	FIELD_SECTION,
	SETTINGS_DEFAULTS,
	SETTINGS_SECTIONS,
	changedFields,
	initials,
} from "./values";

const css = readFileSync(new URL("../../styles/settings-block.css", import.meta.url), "utf8");
const index = readFileSync(new URL("../../styles/index.css", import.meta.url), "utf8");

describe("values", () => {
	it("lists the changed fields only", () => {
		expect(changedFields(SETTINGS_DEFAULTS, SETTINGS_DEFAULTS)).toEqual([]);
		expect(
			changedFields({ ...SETTINGS_DEFAULTS, name: "Ada", theme: "dark" }, SETTINGS_DEFAULTS),
		).toEqual(["name", "theme"]);
	});

	it("maps every field to a section that exists", () => {
		const ids = SETTINGS_SECTIONS.map((section) => section.id);
		for (const key of Object.keys(SETTINGS_DEFAULTS)) {
			expect(ids).toContain(FIELD_SECTION[key as keyof typeof FIELD_SECTION]);
		}
	});

	it("takes up to two initials", () => {
		expect(initials("Ada Lovelace")).toBe("AL");
		expect(initials("  ada  ")).toBe("A");
		expect(initials("Grace Brewster Murray Hopper")).toBe("GH");
		expect(initials("")).toBe("?");
	});

	it("escapes a phrase into a pattern that matches only itself", () => {
		const pattern = new RegExp(`^(?:${escapePattern("delete (my) account?")})$`, "v");
		expect(pattern.test("delete (my) account?")).toBe(true);
		expect(pattern.test("delete my account")).toBe(false);
		expect(escapePattern("delete my account")).toBe("delete my account");
	});
});

describe("SettingsBlock", () => {
	const html = renderToStaticMarkup(
		<SettingsBlock
			email="ada@example.com"
			plan="Pro"
			defaultValues={{ name: "Ada Lovelace", username: "ada" }}
		/>,
	);
	const tag = (name: string) =>
		html.match(new RegExp(`<(?:input|select|textarea)[^>]*name="${name}"[^>]*>`))?.[0] ?? "";

	it("renders five sections as tabs, the first selected, its panel shown and the rest hidden", () => {
		expect(html).toMatch(/role="tablist"[^>]*aria-orientation="vertical"/);
		const tabs = [...html.matchAll(/role="tab"[^>]*aria-selected="(true|false)"/g)].map(
			(m) => m[1],
		);
		expect(tabs).toEqual(["true", "false", "false", "false", "false"]);
		for (const { label } of SETTINGS_SECTIONS) expect(html).toContain(`>${label}</span>`);
		expect(html.match(/role="tabpanel"[^>]*hidden=""/g)).toHaveLength(4);
	});

	it("puts every saved control in one native form by its form attribute", () => {
		const form = html.match(/<form[^>]*id="([^"]+)"[^>]*>/);
		expect(form?.[0]).toMatch(/novalidate/i);
		const id = form?.[1];
		for (const name of [
			"name",
			"username",
			"website",
			"bio",
			"language",
			"timezone",
			"mentions",
			"dailyDigest",
			"theme",
			"density",
		]) {
			expect(tag(name), name).toContain(`form="${id}"`);
		}
	});

	it("uses the native constraints for validation", () => {
		expect(tag("name")).toMatch(/required/);
		expect(tag("username")).toMatch(/pattern="\[a-z0-9_\]\{3,20\}"/);
		expect(tag("website")).toMatch(/type="url"/);
		expect(tag("bio")).toMatch(/maxLength="160"/i);
		expect(tag("language")).toMatch(/required/);
		expect(tag("mentions")).toMatch(/role="switch"/);
		expect(tag("theme")).toMatch(/type="radio"/);
	});

	it("starts clean: no dirty form, no motion flag, the plan as a badge", () => {
		expect(html).not.toContain("data-dirty");
		expect(html).not.toContain("data-moved");
		expect(html).toMatch(/role="region" aria-label="Unsaved changes"/);
		expect(html).toContain(">Pro<");
		expect(html).toContain(">AL<");
		expect(html).toContain("ada@example.com");
	});

	it("opens the dialogs from buttons announced as such", () => {
		expect(html).toMatch(/aria-haspopup="dialog"[^>]*>.*?Change email/);
		expect(html).toMatch(/aria-haspopup="dialog"[^>]*>.*?Delete account/);
		expect(html.match(/<dialog /g)).toHaveLength(2);
	});

	it("gives every id once", () => {
		const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
		expect(ids.length).toBe(new Set(ids).size);
	});

	it("titles itself with the given heading level, cards one below", () => {
		const nested = renderToStaticMarkup(<SettingsBlock headingLevel={3} />);
		expect(nested).toMatch(/<h3[^>]*>Settings<\/h3>/);
		expect(nested).toMatch(/<h4[^>]*>Profile<\/h4>/);
	});
});

describe("settings-block.css", () => {
	it("is part of styles.css", () => {
		expect(index).toContain('@import "./settings-block.css";');
	});

	it("has a rule for every class the block uses", () => {
		for (const name of Object.values(settingsParts)) {
			expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
		}
	});

	it("lays the sections out by a container query and shows the bar with :has()", () => {
		expect(css).toContain("container: rx-settings / inline-size");
		expect(css).toContain("@container rx-settings (width >= 40rem)");
		expect(css).toContain(".rx-settings:has(> form[data-dirty]) > .rx-settings-bar");
		expect(css).toContain("display 160ms allow-discrete");
		expect(css).toContain("@starting-style");
	});

	it("stops motion in the rx-motion layer, for less motion and motion off", () => {
		const layer = css.slice(css.indexOf("@layer rx-motion"));
		expect(layer).toContain("@media (prefers-reduced-motion: reduce)");
		expect(layer).toContain('[data-motion="off"] .rx-settings .rx-settings-bar');
		expect(css).not.toContain("!important");
	});

	it("is imported by no block file through a folder index (the registry copies files)", () => {
		for (const file of readdirSync(new URL(".", import.meta.url))) {
			if (!/\.tsx?$/.test(file)) continue;
			const code = readFileSync(new URL(file, import.meta.url), "utf8");
			for (const [, spec] of code.matchAll(/from "(\.\.\/\.\.\/[^"]+)"/g)) {
				expect(spec.split("/").length, `${file}: ${spec}`).toBe(4);
			}
		}
	});
});
