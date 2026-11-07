"use client";

import { Field } from "@rabtx/ui/field";
import { Slider } from "@rabtx/ui/slider";
import { usePathname } from "next/navigation";
import { type ComponentType, type CSSProperties, useState } from "react";
import AccordionDefault from "./examples/accordion/default";
import CommandBlockExample from "./examples/blocks/command";
import SettingsBlockExample from "./examples/blocks/settings";
import SignupBlockExample from "./examples/blocks/signup";
import ButtonVariants from "./examples/button/variants";
import CardDefault from "./examples/card/default";
import CheckboxDefault from "./examples/checkbox/default";
import CollapsibleDefault from "./examples/collapsible/default";
import DialogDefault from "./examples/dialog/default";
import DropdownMenuDefault from "./examples/dropdown-menu/default";
import InputDefault from "./examples/input/default";
import PopoverDefault from "./examples/popover/default";
import RadioGroupDefault from "./examples/radio-group/default";
import SelectDefault from "./examples/select/default";
import SliderDefault from "./examples/slider/default";
import SwitchDefault from "./examples/switch/default";
import TabsDefault from "./examples/tabs/default";
import ToastDefault from "./examples/toast/default";
import TooltipDefault from "./examples/tooltip/default";

type ThemeName = "light" | "dark";
type RadiusName = "sharp" | "default" | "round";
type SizeName = "sm" | "md" | "lg";
type ColorId = (typeof COLORS)[number]["id"];

const COLORS = [
	{ id: "ink", label: "Ink", light: "", dark: "", lightFg: "", darkFg: "" },
	{
		id: "blue",
		label: "Blue",
		light: "#2563eb",
		lightFg: "#ffffff",
		dark: "#60a5fa",
		darkFg: "#0f172a",
	},
	{
		id: "violet",
		label: "Violet",
		light: "#6d28d9",
		lightFg: "#ffffff",
		dark: "#c4b5fd",
		darkFg: "#1e1b4b",
	},
	{
		id: "green",
		label: "Green",
		light: "#15803d",
		lightFg: "#ffffff",
		dark: "#4ade80",
		darkFg: "#052e16",
	},
	{
		id: "orange",
		label: "Orange",
		light: "#c2410c",
		lightFg: "#ffffff",
		dark: "#fdba74",
		darkFg: "#431407",
	},
	{
		id: "rose",
		label: "Rose",
		light: "#be123c",
		lightFg: "#ffffff",
		dark: "#fda4af",
		darkFg: "#4c0519",
	},
] as const;

const PAGES: Record<string, { title: string; Stage: ComponentType }> = {
	"/docs/ui": { title: "Components", Stage: Overview },
	"/docs/ui/theming": { title: "Theming", Stage: Overview },
	"/docs/ui/button": { title: "Button", Stage: ButtonVariants },
	"/docs/ui/select": { title: "Select", Stage: SelectDefault },
	"/docs/ui/checkbox": { title: "Checkbox", Stage: CheckboxDefault },
	"/docs/ui/switch": { title: "Switch", Stage: SwitchDefault },
	"/docs/ui/radio-group": { title: "Radio group", Stage: RadioGroupDefault },
	"/docs/ui/slider": { title: "Slider", Stage: SliderDefault },
	"/docs/ui/tabs": { title: "Tabs", Stage: TabsDefault },
	"/docs/ui/accordion": { title: "Accordion", Stage: AccordionDefault },
	"/docs/ui/collapsible": { title: "Collapsible", Stage: CollapsibleDefault },
	"/docs/ui/input": { title: "Input", Stage: InputDefault },
	"/docs/ui/card": { title: "Card", Stage: CardDefault },
	"/docs/ui/dialog": { title: "Dialog", Stage: DialogDefault },
	"/docs/ui/tooltip": { title: "Tooltip", Stage: TooltipDefault },
	"/docs/ui/popover": { title: "Popover", Stage: PopoverDefault },
	"/docs/ui/dropdown-menu": { title: "Dropdown menu", Stage: DropdownMenuDefault },
	"/docs/ui/toast": { title: "Toast", Stage: ToastDefault },
	"/docs/ui/blocks": { title: "Sign up", Stage: SignupBlockExample },
	"/docs/ui/blocks/signup": { title: "Sign up", Stage: SignupBlockExample },
	"/docs/ui/blocks/command": { title: "Command", Stage: CommandBlockExample },
	"/docs/ui/blocks/settings": { title: "Settings", Stage: SettingsBlockExample },
};

function Overview() {
	return (
		<div className="grid w-full max-w-md gap-8">
			<div className="flex flex-wrap gap-2">
				<ButtonVariants />
			</div>
			<InputDefault />
			<SliderDefault />
			<div className="flex flex-wrap gap-8">
				<CheckboxDefault />
				<SwitchDefault />
			</div>
			<TabsDefault />
		</div>
	);
}

function Pills<T extends string>({
	legend,
	name,
	value,
	options,
	onChange,
}: {
	legend: string;
	name: string;
	value: T;
	options: readonly { id: T; label: string }[];
	onChange: (value: T) => void;
}) {
	return (
		<fieldset className="grid gap-2">
			<legend className="text-[13px]">{legend}</legend>
			<div className="flex gap-0.5 rounded-[10px] bg-muted p-0.5">
				{options.map((option) => (
					<label
						key={option.id}
						className="flex-1 cursor-pointer rounded-[8px] px-2 py-1 text-center text-[13px] text-muted-foreground has-checked:bg-card has-checked:text-foreground has-checked:shadow-[0_0_0_1px_var(--input)] has-focus-visible:outline-2 has-focus-visible:outline-ring"
					>
						<input
							type="radio"
							name={name}
							value={option.id}
							checked={value === option.id}
							onChange={() => onChange(option.id)}
							className="sr-only"
						/>
						{option.label}
					</label>
				))}
			</div>
		</fieldset>
	);
}

/**
 * One floating example. Radius, primary, size and a single animation duration sit on this
 * element, so every component inside follows them. An explicit size on one control still wins.
 */
export function UiCanvas() {
	const pathname = usePathname();
	const page = PAGES[pathname] ?? { title: "Components", Stage: Overview };
	const Stage = page.Stage;
	const wide = pathname.startsWith("/docs/ui/blocks");
	const [theme, setTheme] = useState<ThemeName>("light");
	const [radius, setRadius] = useState<RadiusName>("default");
	const [size, setSize] = useState<SizeName>("md");
	const [primary, setPrimary] = useState<ColorId>("ink");
	const [motionMs, setMotionMs] = useState(280);

	const color = COLORS.find((item) => item.id === primary);
	const style: Record<string, string | number> = { "--motion-ms": motionMs };
	if (color?.light) {
		const hex = theme === "dark" ? color.dark : color.light;
		const fg = theme === "dark" ? color.darkFg : color.lightFg;
		style["--primary"] = hex;
		style["--primary-foreground"] = fg;
		style["--ring"] = hex;
		style["--sidebar-primary"] = hex;
		style["--sidebar-primary-foreground"] = fg;
		style["--chart-1"] = hex;
	}

	return (
		<main
			aria-label="UI canvas"
			data-depth="floating"
			data-radius={radius}
			data-size={size}
			data-motion="on"
			style={style as CSSProperties}
			className={`rabtx ${theme} [grid-area:main] flex min-h-[calc(100dvh-var(--fd-header-height,0px))] min-w-0 flex-col bg-background text-foreground lg:flex-row`}
		>
			<div className="flex min-w-0 flex-1 flex-col px-5 py-8 lg:px-10">
				<p className="text-sm text-muted-foreground">{page.title}</p>
				<div
					className={
						wide
							? "flex flex-1 items-start justify-center py-8"
							: "flex flex-1 items-center justify-center py-8"
					}
				>
					<Stage />
				</div>
			</div>
			<aside className="border-t border-border px-5 py-6 lg:sticky lg:top-(--fd-docs-row-2) lg:h-[calc(100dvh-var(--fd-header-height,0px))] lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-s">
				<p className="text-xs font-medium text-muted-foreground">Customize</p>
				<div className="mt-4 grid gap-5">
					<Pills
						legend="Theme"
						name="ui-theme"
						value={theme}
						onChange={setTheme}
						options={[
							{ id: "light", label: "Light" },
							{ id: "dark", label: "Dark" },
						]}
					/>
					<Pills
						legend="Radius"
						name="ui-radius"
						value={radius}
						onChange={setRadius}
						options={[
							{ id: "sharp", label: "Sharp" },
							{ id: "default", label: "Default" },
							{ id: "round", label: "Round" },
						]}
					/>
					<Pills
						legend="Size"
						name="ui-size"
						value={size}
						onChange={setSize}
						options={[
							{ id: "sm", label: "Small" },
							{ id: "md", label: "Medium" },
							{ id: "lg", label: "Large" },
						]}
					/>
					<fieldset className="grid gap-2">
						<legend className="text-[13px]">Primary</legend>
						<div className="flex gap-2">
							{COLORS.map((item) => {
								const fill = item.light
									? theme === "dark"
										? item.dark
										: item.light
									: "var(--foreground)";
								return (
									<label
										key={item.id}
										title={item.label}
										className="cursor-pointer rounded-full has-checked:outline-2 has-checked:outline-offset-2 has-checked:outline-ring"
									>
										<input
											type="radio"
											name="ui-primary"
											value={item.id}
											checked={primary === item.id}
											onChange={() => setPrimary(item.id)}
											className="sr-only"
										/>
										<span className="sr-only">{item.label}</span>
										<span
											aria-hidden
											className="block size-6 rounded-full shadow-[0_0_0_1px_var(--input)]"
											style={{ background: fill }}
										/>
									</label>
								);
							})}
						</div>
					</fieldset>
					<Field label="Animation" className="w-full">
						<Slider
							aria-label="Animation"
							min={0}
							max={900}
							step={10}
							value={[motionMs]}
							onValueChange={([next]) => {
								if (next !== undefined) setMotionMs(next);
							}}
							showValue="always"
							formatValue={(value) => `${value} ms`}
						/>
					</Field>
					<p className="text-xs text-muted-foreground">
						Depth stays floating. One duration, in milliseconds, drives every spring.
					</p>
				</div>
			</aside>
		</main>
	);
}
