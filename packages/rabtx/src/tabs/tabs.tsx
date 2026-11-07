"use client";

import {
	type ButtonHTMLAttributes,
	createContext,
	type FocusEvent,
	type HTMLAttributes,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	type Ref,
	useCallback,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "../lib/utils";
import {
	type TabsActivationMode,
	type TabsOrientation,
	type TabsSize,
	type TabsVariant,
	tabsListClass,
	tabsParts,
} from "./tabs.styles";

type TabsContextValue = {
	value: string | undefined;
	select: (value: string) => void;
	orientation: TabsOrientation;
	activationMode: TabsActivationMode;
	triggerId: (value: string) => string;
	panelId: (value: string) => string;
	/** Whether `value` has a panel, so a tab only points `aria-controls` at a panel that exists. */
	hasPanel: (value: string) => boolean;
	registerPanel: (value: string) => () => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(part: string) {
	const context = useContext(TabsContext);
	if (!context) throw new Error(`${part} must be inside <Tabs>`);
	return context;
}

/** Any value is a valid tab value; ids keep only the characters an id selector can take as is. */
const slug = (value: string) => value.replace(/[^\w-]/g, "_");

export type TabsProps = Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "dir"> & {
	/** The selected tab (controlled). */
	value?: string;
	/** The tab selected first (uncontrolled). */
	defaultValue?: string;
	/** The newly selected value, only when it changes. */
	onValueChange?: (value: string) => void;
	/** Lays the list beside the panels and moves focus with the up and down arrows. */
	orientation?: TabsOrientation;
	/** `automatic` (default) selects a tab when the arrow keys reach it; `manual` needs Enter or Space. */
	activationMode?: TabsActivationMode;
	/** Reading direction. Left and right arrows swap in `rtl`; it is inherited when unset. */
	dir?: "ltr" | "rtl";
	ref?: Ref<HTMLDivElement>;
};

/**
 * WAI-ARIA tabs: a `tablist` of `tab` buttons, each controlling a `tabpanel`. Only the selected tab
 * is in the Tab order (a roving tab stop); the arrow keys, Home and End move between tabs. Every
 * panel stays mounted and is `hidden` while its tab is not selected, so its content is in the
 * server HTML and a tab's `aria-controls` resolves from the first paint.
 *
 * The indicator slides by CSS anchor positioning and a `linear()` spring; panels fade in with
 * `@starting-style`. JavaScript only holds the selected value.
 */
export function Tabs({
	value: valueProp,
	defaultValue,
	onValueChange,
	orientation = "horizontal",
	activationMode = "automatic",
	className,
	children,
	ref,
	...rest
}: TabsProps) {
	const [internal, setInternal] = useState(defaultValue);
	const controlled = valueProp !== undefined;
	const value = controlled ? valueProp : internal;
	const [panels, setPanels] = useState<ReadonlySet<string>>(() => new Set());
	// Panels register in an effect, which the server never runs. Until hydration every tab assumes
	// its panel exists, so the server HTML is wired; after it, a list without panels drops the link.
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);
	const baseId = useId();

	const select = useCallback(
		(next: string) => {
			if (next === value) return;
			if (!controlled) setInternal(next);
			onValueChange?.(next);
		},
		[controlled, onValueChange, value],
	);

	const registerPanel = useCallback((panel: string) => {
		setPanels((current) => (current.has(panel) ? current : new Set(current).add(panel)));
		return () =>
			setPanels((current) => {
				if (!current.has(panel)) return current;
				const next = new Set(current);
				next.delete(panel);
				return next;
			});
	}, []);

	const context = useMemo<TabsContextValue>(
		() => ({
			value,
			select,
			orientation,
			activationMode,
			triggerId: (tab) => `${baseId}-tab-${slug(tab)}`,
			panelId: (tab) => `${baseId}-panel-${slug(tab)}`,
			hasPanel: (tab) => !hydrated || panels.has(tab),
			registerPanel,
		}),
		[value, select, orientation, activationMode, baseId, hydrated, panels, registerPanel],
	);

	return (
		<TabsContext.Provider value={context}>
			<div
				{...rest}
				ref={ref}
				data-orientation={orientation}
				className={cn(tabsParts.root, className)}
			>
				{children}
			</div>
		</TabsContext.Provider>
	);
}

export type TabsListProps = HTMLAttributes<HTMLDivElement> & {
	/**
	 * `segmented` (default): a recessed track with a raised thumb. `pill`: a filled capsule on a
	 * raised track. `underline`: a line under the selected tab. `expandable`: icon tabs where the
	 * selected one opens to show its label.
	 */
	variant?: TabsVariant;
	/** 32, 40 (default) or 48px tall, so a tab list lines up with a Button, an Input or a Select. */
	size?: TabsSize;
	ref?: Ref<HTMLDivElement>;
};

/** The enabled tabs of this list (not of a list nested in one of its panels). */
function enabledTabs(list: HTMLElement) {
	return Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]')).filter(
		(tab) => !tab.disabled && tab.closest('[role="tablist"]') === list,
	);
}

export function TabsList({
	variant = "segmented",
	size = "md",
	className,
	children,
	onKeyDown,
	ref,
	...rest
}: TabsListProps) {
	const { orientation } = useTabs("TabsList");
	const list = useRef<HTMLDivElement>(null);

	// The selected tab is the tab stop. When nothing enabled is selected (no value yet, or the
	// selected tab is disabled) the first enabled tab takes it, so the list is never skipped.
	useLayoutEffect(() => {
		const node = list.current;
		if (!node) return;
		const tabs = enabledTabs(node);
		if (tabs.length && !tabs.some((tab) => tab.tabIndex === 0)) tabs[0].tabIndex = 0;
	});

	const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
		onKeyDown?.(event);
		const node = list.current;
		if (event.defaultPrevented || !node) return;
		const tabs = enabledTabs(node);
		const at = tabs.indexOf(event.target as HTMLButtonElement);
		if (at < 0) return;
		const rtl = getComputedStyle(node).direction === "rtl";
		const vertical = orientation === "vertical";
		const forward = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
		const back = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
		const next =
			event.key === forward
				? tabs[(at + 1) % tabs.length]
				: event.key === back
					? tabs[(at - 1 + tabs.length) % tabs.length]
					: event.key === "Home"
						? tabs[0]
						: event.key === "End"
							? tabs[tabs.length - 1]
							: undefined;
		if (!next) return;
		event.preventDefault();
		// In automatic mode the tab selects itself as it takes focus (see TabsTrigger).
		next.focus();
	};

	return (
		// The tablist itself is not focusable: its tabs are, with one roving tab stop (WAI-ARIA tabs).
		// oxlint-disable-next-line jsx-a11y/interactive-supports-focus
		<div
			{...rest}
			ref={(node) => {
				list.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref) ref.current = node;
			}}
			role="tablist"
			aria-orientation={orientation}
			data-orientation={orientation}
			className={cn(tabsListClass(variant, size), className)}
			onKeyDown={moveFocus}
		>
			{children}
			{/* Last, so the selected tab is laid out before the indicator that anchors to it. */}
			{variant === "expandable" ? null : (
				<span className={tabsParts.indicator} aria-hidden="true" />
			)}
		</div>
	);
}

export type TabsTriggerProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "type"> & {
	/** The value this tab selects. Matches a TabsContent's `value`. */
	value: string;
	/** A decorative icon before the label, such as a HugeIcons element. Needed by `expandable`. */
	icon?: ReactNode;
	ref?: Ref<HTMLButtonElement>;
};

export function TabsTrigger({
	value,
	icon,
	className,
	children,
	onClick,
	onFocus,
	ref,
	...rest
}: TabsTriggerProps) {
	const tabs = useTabs("TabsTrigger");
	const selected = tabs.value === value;

	return (
		<button
			id={tabs.triggerId(value)}
			aria-controls={tabs.hasPanel(value) ? tabs.panelId(value) : undefined}
			{...rest}
			ref={ref}
			type="button"
			role="tab"
			aria-selected={selected}
			data-state={selected ? "active" : "inactive"}
			tabIndex={selected ? 0 : -1}
			className={cn(tabsParts.trigger, className)}
			onClick={(event: MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				if (!event.defaultPrevented) tabs.select(value);
			}}
			onFocus={(event: FocusEvent<HTMLButtonElement>) => {
				onFocus?.(event);
				if (!event.defaultPrevented && tabs.activationMode === "automatic") tabs.select(value);
			}}
		>
			{icon ? (
				<span className={tabsParts.icon} aria-hidden="true">
					{icon}
				</span>
			) : null}
			<span className={tabsParts.label}>
				<span className={tabsParts.text}>{children}</span>
			</span>
		</button>
	);
}

export type TabsContentProps = HTMLAttributes<HTMLDivElement> & {
	/** The tab value this panel belongs to. */
	value: string;
	ref?: Ref<HTMLDivElement>;
};

export function TabsContent({ value, className, children, ref, ...rest }: TabsContentProps) {
	const tabs = useTabs("TabsContent");
	const { registerPanel } = tabs;
	const selected = tabs.value === value;

	useLayoutEffect(() => registerPanel(value), [registerPanel, value]);

	return (
		<div
			id={tabs.panelId(value)}
			aria-labelledby={tabs.triggerId(value)}
			// In the Tab order, so a panel with no focusable content can still be reached and read.
			tabIndex={0}
			{...rest}
			ref={ref}
			role="tabpanel"
			hidden={!selected}
			data-state={selected ? "active" : "inactive"}
			className={cn(tabsParts.content, className)}
		>
			{children}
		</div>
	);
}
