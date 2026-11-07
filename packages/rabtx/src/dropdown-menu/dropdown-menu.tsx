"use client";

import {
	type ButtonHTMLAttributes,
	createContext,
	type CSSProperties,
	type HTMLAttributes,
	type KeyboardEvent,
	type MouseEvent,
	type PointerEvent,
	type ReactNode,
	type Ref,
	type RefObject,
	use,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	anchorName,
	mergeRefs,
	type PopoverAlign,
	type PopoverSide,
	type PopoverState,
	type PopoverStateOptions,
	Slot,
	usePopoverState,
} from "../hooks/use-popover";
import { cn } from "../lib/utils";
import {
	type MenuItemVariant,
	menuItems,
	menuParts,
	nextIndex,
	typeaheadMatch,
} from "./dropdown-menu.styles";

/**
 * Where focus goes when a menu opens: its first or last row (keyboard), the menu itself (a click),
 * or nowhere (a submenu opened by hover keeps focus on its row).
 */
type Landing = "first" | "last" | "menu" | "stay";

/** One menu that opens from something: a dropdown's trigger, a pointer, or a submenu's row. */
export type MenuRoot = {
	state: PopoverState;
	contentId: string;
	triggerId?: string;
	anchor: string;
	landing: RefObject<Landing>;
};

/** The top menu: every row closes it after it runs. */
const RootContext = createContext<{ close: () => void } | null>(null);
/** The dropdown (or context menu) whose content renders next. */
const MenuRootContext = createContext<MenuRoot | null>(null);

type LevelValue = {
	menuRef: RefObject<HTMLElement | null>;
	/** The id of the submenu open from this menu, if any. */
	openSub: string | null;
	setOpenSub: (id: string | null) => void;
	/** The pointer is over a row: open its submenu, or close the open one, after a short grace. */
	hover: (sub: string | null) => void;
	/** The pointer reached the open submenu: keep it. */
	hold: () => void;
	/** Close this menu, when it is a submenu, and focus its row in the parent. */
	back?: () => void;
};
/** The menu a row belongs to. */
const LevelContext = createContext<LevelValue | null>(null);

function useLevel(part: string) {
	const level = use(LevelContext);
	if (!level) throw new Error(`${part} must be used inside a menu's content`);
	return level;
}

function useMenuRoot(part: string) {
	const root = use(MenuRootContext);
	if (!root) throw new Error(`${part} must be used inside <DropdownMenu>`);
	return root;
}

/** The state of one menu that opens from something; shared by dropdowns and context menus. */
export function useMenuState(options: PopoverStateOptions, triggered: boolean): MenuRoot {
	const id = useId();
	const state = usePopoverState(options);
	const landing = useRef<Landing>("menu");
	return useMemo(
		() => ({
			state,
			contentId: `${id}-menu`,
			triggerId: triggered ? `${id}-trigger` : undefined,
			anchor: anchorName(id),
			landing,
		}),
		[state, id, triggered],
	);
}

/** Provides a top menu to its trigger and content. */
export function MenuProvider({ root, children }: { root: MenuRoot; children?: ReactNode }) {
	const { setOpen } = root.state;
	const top = useMemo(() => ({ close: () => setOpen(false) }), [setOpen]);
	return (
		<RootContext value={top}>
			<MenuRootContext value={root}>{children}</MenuRootContext>
		</RootContext>
	);
}

export type DropdownMenuProps = PopoverStateOptions & { children?: ReactNode };

/**
 * A menu of actions that opens from a button: WAI-ARIA's menu button pattern on the native Popover
 * API. Arrow keys, Home and End, typeahead and Escape work as in a desktop menu; a press outside
 * closes it and focus goes back to the button.
 */
export function DropdownMenu({ children, ...options }: DropdownMenuProps) {
	const root = useMenuState(options, true);
	return <MenuProvider root={root}>{children}</MenuProvider>;
}

export type DropdownMenuTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	/**
	 * Merge into the one child element instead of rendering a button, such as our `Button`. The
	 * child must forward its props and ref to a `<button>`.
	 */
	asChild?: boolean;
	ref?: Ref<HTMLButtonElement>;
};

/**
 * The menu button: a native invoker (`popovertarget`), so it opens the menu before hydration, and
 * the anchor the menu is placed against. Enter, Space and ArrowDown open it on the first row,
 * ArrowUp on the last; a click opens it with focus on the menu.
 */
export function DropdownMenuTrigger({
	ref,
	style,
	onClick,
	onKeyDown,
	...rest
}: DropdownMenuTriggerProps) {
	const root = useMenuRoot("DropdownMenuTrigger");
	return (
		<Slot
			id={root.triggerId}
			{...rest}
			ref={mergeRefs(ref as Ref<HTMLElement>, (node: HTMLElement | null) => {
				root.state.triggerRef.current = node;
			})}
			style={{ ...style, anchorName: root.anchor }}
			popoverTarget={root.contentId}
			aria-haspopup="menu"
			aria-expanded={root.state.open}
			aria-controls={root.contentId}
			data-state={root.state.open ? "open" : "closed"}
			data-slot="dropdown-menu-trigger"
			onClick={(event: MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				// A click from Enter or Space has no pointer detail: land on the first row.
				root.landing.current = event.detail === 0 ? "first" : "menu";
			}}
			onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
				onKeyDown?.(event);
				if (event.defaultPrevented) return;
				if (event.key === "ArrowDown" || event.key === "ArrowUp") {
					event.preventDefault();
					root.landing.current = event.key === "ArrowDown" ? "first" : "last";
					if (root.state.open) {
						const menu = root.state.contentRef.current;
						const items = menu ? menuItems(menu) : [];
						items.at(event.key === "ArrowDown" ? 0 : -1)?.focus();
					} else root.state.setOpen(true);
				}
			}}
		/>
	);
}

export type MenuContentProps = Omit<HTMLAttributes<HTMLDivElement>, "popover"> & {
	/** The side of the anchor it opens on. Flips to the other side when it would not fit. */
	side?: PopoverSide;
	/** Line up with the anchor's start edge (default), center or end edge. */
	align?: PopoverAlign;
	/** The gap to the anchor, in px. Default 8. */
	sideOffset?: number;
	/** Classes for the panel (width). Props other than these go on the `role="menu"` element. */
	className?: string;
	ref?: Ref<HTMLDivElement>;
};

const TYPEAHEAD_MS = 500;
const OPEN_DELAY = 90;
const CLOSE_DELAY = 260;

/** The menu panel shared by dropdowns, submenus and context menus. */
export function MenuPanel({
	root,
	back,
	side,
	align,
	sideOffset,
	className,
	style,
	children,
	ref,
	onKeyDown,
	onPointerEnter,
	slot,
	...rest
}: MenuContentProps & { root: MenuRoot; back?: () => void; slot: string }) {
	const { state, landing } = root;
	const [openSub, setOpenSubState] = useState<string | null>(null);
	const openSubRef = useRef(openSub);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const typed = useRef("");
	const typedAt = useRef(0);

	const setOpenSub = useCallback((id: string | null) => {
		clearTimeout(timer.current);
		openSubRef.current = id;
		setOpenSubState(id);
	}, []);
	const hover = useCallback(
		(sub: string | null) => {
			clearTimeout(timer.current);
			if (sub === openSubRef.current) return;
			timer.current = setTimeout(() => setOpenSub(sub), sub ? OPEN_DELAY : CLOSE_DELAY);
		},
		[setOpenSub],
	);
	const hold = useCallback(() => clearTimeout(timer.current), []);
	useEffect(() => () => clearTimeout(timer.current), []);
	// A closed menu forgets its open submenu.
	if (!state.open && openSub !== null) setOpenSubState(null);
	useLayoutEffect(() => {
		openSubRef.current = openSub;
	}, [openSub]);

	const level = useMemo<LevelValue>(
		() => ({ menuRef: state.contentRef, openSub, setOpenSub, hover, hold, back }),
		[state.contentRef, openSub, setOpenSub, hover, hold, back],
	);

	const { onShown } = state;
	useLayoutEffect(() => {
		onShown.current = (menu) => {
			const items = menuItems(menu);
			const target =
				landing.current === "first"
					? items[0]
					: landing.current === "last"
						? items.at(-1)
						: undefined;
			if (landing.current !== "stay") (target ?? menu).focus({ preventScroll: true });
			landing.current = "menu";
		};
	}, [onShown, landing]);

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		onKeyDown?.(event);
		const menu = event.currentTarget;
		// Keys pressed in a submenu bubble through this one in the DOM; they are not ours.
		if (event.defaultPrevented || (event.target as Element).closest('[role="menu"]') !== menu)
			return;
		const items = menuItems(menu);
		const current = items.indexOf(document.activeElement as HTMLElement);
		const next = nextIndex(event.key, current, items.length);
		if (next >= 0) {
			event.preventDefault();
			items[next].focus();
			return;
		}
		if (event.key === "Tab") {
			// Close the whole menu; the browser hands focus back to the trigger and Tab moves on.
			let top: HTMLElement = menu;
			for (let el = menu.parentElement?.closest<HTMLElement>('[role="menu"]'); el;) {
				top = el;
				el = el.parentElement?.closest<HTMLElement>('[role="menu"]');
			}
			top.hidePopover();
			return;
		}
		if (event.key === "ArrowLeft" && back) {
			event.preventDefault();
			back();
			return;
		}
		if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
			if (event.key === " " && typed.current === "") return;
			event.preventDefault();
			const now = event.timeStamp;
			typed.current = now - typedAt.current > TYPEAHEAD_MS ? event.key : typed.current + event.key;
			typedAt.current = now;
			const match = typeaheadMatch(
				items.map((item) => item.dataset.textValue ?? item.textContent ?? ""),
				current,
				typed.current,
			);
			if (match >= 0) items[match].focus();
		}
	};

	return (
		<LevelContext value={level}>
			<div
				role="menu"
				aria-labelledby={root.triggerId}
				aria-orientation="vertical"
				tabIndex={-1}
				{...rest}
				id={root.contentId}
				ref={mergeRefs(ref, (node: HTMLDivElement | null) => {
					state.contentRef.current = node;
				})}
				popover="auto"
				className="rx-popover"
				data-side={side}
				data-align={align}
				style={
					{
						...style,
						positionAnchor: root.anchor,
						...(sideOffset === undefined ? null : { "--_offset": `${sideOffset}px` }),
					} as CSSProperties
				}
				data-state={state.open ? "open" : "closed"}
				data-slot={slot}
				onToggle={state.onToggle}
				onBeforeToggle={state.onBeforeToggle}
				onKeyDown={handleKeyDown}
				onPointerEnter={onPointerEnter}
				onContextMenu={(event) => event.preventDefault()}
			>
				<div className={cn("rx-surface rx-popover-surface", menuParts.menu, className)}>
					{children}
					{/* Last, so the rows are laid out before the highlight that anchors to them. */}
					<span className={menuParts.highlight} aria-hidden="true" />
				</div>
			</div>
		</LevelContext>
	);
}

export type DropdownMenuContentProps = MenuContentProps;

/**
 * The menu: a `role="menu"` `[popover]` in the top layer, anchored to the trigger. Below it and
 * lined up with its start edge by default; it flips when it would not fit.
 */
export function DropdownMenuContent({
	side = "bottom",
	align = "start",
	...rest
}: DropdownMenuContentProps) {
	const root = useMenuRoot("DropdownMenuContent");
	return <MenuPanel {...rest} root={root} side={side} align={align} slot="dropdown-menu-content" />;
}

type ItemBaseProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
	/** Runs when the row is chosen (click, Enter or Space). Call `event.preventDefault()` to keep the menu open. */
	onSelect?: (event: Event) => void;
	/** Not chosen, skipped by the arrow keys, drawn at half strength. */
	disabled?: boolean;
	/** `destructive` draws the row (and its highlight) in the destructive color. */
	variant?: MenuItemVariant;
	/** Indent the row to line up with rows that have a tick or an icon. */
	inset?: boolean;
	/** An icon before the label, such as a HugeIcons icon. Hidden from screen readers. */
	icon?: ReactNode;
	/** A keyboard shortcut drawn at the end of the row, such as "⌘C". It does not bind the keys. */
	shortcut?: ReactNode;
	/** The text typeahead matches, when the row's text is not plain (an icon, a badge). */
	textValue?: string;
	ref?: Ref<HTMLDivElement>;
};

function ItemBase({
	role = "menuitem",
	onSelect,
	disabled,
	variant = "default",
	inset,
	icon,
	shortcut,
	textValue,
	className,
	children,
	before,
	after,
	keepOpen,
	onClick,
	onKeyDown,
	onPointerMove,
	onPointerLeave,
	ref,
	...rest
}: ItemBaseProps & {
	before?: ReactNode;
	after?: ReactNode;
	/** A submenu's row opens its menu instead of closing this one. */
	keepOpen?: boolean;
}) {
	const level = useLevel("A menu item");
	const top = use(RootContext);
	return (
		// oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- role is menuitem, menuitemcheckbox or menuitemradio
		<div
			role={role}
			tabIndex={-1}
			aria-disabled={disabled || undefined}
			data-disabled={disabled ? "" : undefined}
			data-variant={variant === "default" ? undefined : variant}
			data-inset={inset ? "" : undefined}
			data-text-value={textValue}
			{...rest}
			ref={ref}
			className={cn(menuParts.item, className)}
			onClick={(event: MouseEvent<HTMLDivElement>) => {
				if (disabled) {
					event.preventDefault();
					return;
				}
				onClick?.(event);
				if (event.defaultPrevented) return;
				onSelect?.(event.nativeEvent);
				if (!keepOpen && !event.nativeEvent.defaultPrevented) top?.close();
			}}
			onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
				onKeyDown?.(event);
				if (event.defaultPrevented) return;
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					event.currentTarget.click();
				}
			}}
			onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
				onPointerMove?.(event);
				if (event.defaultPrevented || event.pointerType === "touch") return;
				const item = event.currentTarget;
				if (disabled) level.menuRef.current?.focus({ preventScroll: true });
				else if (document.activeElement !== item) item.focus({ preventScroll: true });
				if (!keepOpen) level.hover(null);
			}}
			onPointerLeave={(event: PointerEvent<HTMLDivElement>) => {
				onPointerLeave?.(event);
				if (event.pointerType === "touch") return;
				if (document.activeElement === event.currentTarget && !keepOpen)
					level.menuRef.current?.focus({ preventScroll: true });
			}}
		>
			{before}
			{icon ? (
				<span className={menuParts.icon} aria-hidden="true">
					{icon}
				</span>
			) : null}
			<span className={menuParts.label}>{children}</span>
			{shortcut ? <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut> : null}
			{after}
		</div>
	);
}

export type DropdownMenuItemProps = ItemBaseProps;

/** A row that runs an action and closes the menu. */
export function DropdownMenuItem(props: DropdownMenuItemProps) {
	return <ItemBase {...props} data-slot="dropdown-menu-item" />;
}

/** The tick a checkbox row draws itself with (HugeIcons "tick 02", MIT). */
function Check() {
	return (
		<span className={menuParts.indicator} aria-hidden="true">
			<svg className={menuParts.check} viewBox="0 0 24 24" fill="none">
				<path d="M5 14L8.5 17.5L19 6.5" pathLength={1} />
			</svg>
		</span>
	);
}

export type DropdownMenuCheckboxItemProps = ItemBaseProps & {
	/** Controlled, with `onCheckedChange`. */
	checked?: boolean;
	defaultChecked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
};

/** A row that turns a setting on and off (`menuitemcheckbox`). The tick draws itself in. */
export function DropdownMenuCheckboxItem({
	checked: checkedProp,
	defaultChecked = false,
	onCheckedChange,
	onSelect,
	...rest
}: DropdownMenuCheckboxItemProps) {
	const [internal, setInternal] = useState(defaultChecked);
	const checked = checkedProp ?? internal;
	return (
		<ItemBase
			{...rest}
			role="menuitemcheckbox"
			aria-checked={checked}
			data-slot="dropdown-menu-checkbox-item"
			before={<Check />}
			onSelect={(event) => {
				onSelect?.(event);
				if (checkedProp === undefined) setInternal(!checked);
				onCheckedChange?.(!checked);
			}}
		/>
	);
}

const RadioContext = createContext<{ value: string; select: (value: string) => void } | null>(null);

export type DropdownMenuRadioGroupProps = Omit<HTMLAttributes<HTMLDivElement>, "defaultValue"> & {
	/** Controlled, with `onValueChange`. */
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
};

/** A set of rows of which one is chosen (`menuitemradio`). */
export function DropdownMenuRadioGroup({
	value: valueProp,
	defaultValue = "",
	onValueChange,
	className,
	...rest
}: DropdownMenuRadioGroupProps) {
	const [internal, setInternal] = useState(defaultValue);
	const value = valueProp ?? internal;
	const radio = useMemo(
		() => ({
			value,
			select: (next: string) => {
				if (valueProp === undefined) setInternal(next);
				onValueChange?.(next);
			},
		}),
		[value, valueProp, onValueChange],
	);
	return (
		<RadioContext value={radio}>
			<DropdownMenuGroup {...rest} className={className} data-slot="dropdown-menu-radio-group" />
		</RadioContext>
	);
}

export type DropdownMenuRadioItemProps = ItemBaseProps & { value: string };

/** One choice in a `DropdownMenuRadioGroup`. Its dot pops in when chosen. */
export function DropdownMenuRadioItem({ value, onSelect, ...rest }: DropdownMenuRadioItemProps) {
	const radio = use(RadioContext);
	if (!radio) throw new Error("DropdownMenuRadioItem must be used inside <DropdownMenuRadioGroup>");
	return (
		<ItemBase
			{...rest}
			role="menuitemradio"
			aria-checked={radio.value === value}
			data-slot="dropdown-menu-radio-item"
			before={
				<span className={menuParts.indicator} aria-hidden="true">
					<span className={menuParts.dot} />
				</span>
			}
			onSelect={(event) => {
				onSelect?.(event);
				radio.select(value);
			}}
		/>
	);
}

const GroupContext = createContext<{ labelId: string; setHasLabel: (has: boolean) => void } | null>(
	null,
);

/** Groups related rows (`role="group"`), named by a `DropdownMenuLabel` inside it. */
export function DropdownMenuGroup({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
	const labelId = useId();
	const [hasLabel, setHasLabel] = useState(false);
	const group = useMemo(() => ({ labelId, setHasLabel }), [labelId]);
	return (
		<GroupContext value={group}>
			<div
				role="group"
				aria-labelledby={hasLabel ? labelId : undefined}
				data-slot="dropdown-menu-group"
				{...rest}
				className={className}
			/>
		</GroupContext>
	);
}

/** A heading in the menu. Inside a group it names the group. */
export function DropdownMenuLabel({
	inset,
	className,
	...rest
}: HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
	const group = use(GroupContext);
	const setHasLabel = group?.setHasLabel;
	useLayoutEffect(() => {
		if (!setHasLabel) return;
		setHasLabel(true);
		return () => setHasLabel(false);
	}, [setHasLabel]);
	return (
		<div
			id={group?.labelId}
			data-inset={inset ? "" : undefined}
			data-slot="dropdown-menu-label"
			{...rest}
			className={cn(menuParts.heading, className)}
		/>
	);
}

/** A line between groups of rows. */
export function DropdownMenuSeparator({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			role="separator"
			aria-orientation="horizontal"
			data-slot="dropdown-menu-separator"
			{...rest}
			className={cn(menuParts.separator, className)}
		/>
	);
}

/** A shortcut hint at the end of a row (or use the item's `shortcut` prop). */
export function DropdownMenuShortcut({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
	return (
		<span
			data-slot="dropdown-menu-shortcut"
			{...rest}
			className={cn(menuParts.shortcut, className)}
		/>
	);
}

const SubContext = createContext<(MenuRoot & { id: string; back: () => void }) | null>(null);

function useSub(part: string) {
	const sub = use(SubContext);
	if (!sub) throw new Error(`${part} must be used inside <DropdownMenuSub>`);
	return sub;
}

export type DropdownMenuSubProps = {
	/** Called when the submenu opens or closes. Its state belongs to the menu it is in. */
	onOpenChange?: (open: boolean) => void;
	children?: ReactNode;
};

/**
 * A submenu: a `DropdownMenuSubTrigger` row and the `DropdownMenuSubContent` it opens beside it.
 * One submenu per menu is open at a time; it is a nested popover, so Escape and a press outside it
 * close it first.
 */
export function DropdownMenuSub({ onOpenChange, children }: DropdownMenuSubProps) {
	const level = useLevel("DropdownMenuSub");
	const id = useId();
	const { setOpenSub } = level;
	const open = level.openSub === id;
	const root = useMenuState(
		{
			open,
			onOpenChange: (next) => {
				if (next) setOpenSub(id);
				else if (level.openSub === id) setOpenSub(null);
				onOpenChange?.(next);
			},
		},
		true,
	);
	const back = useCallback(() => {
		setOpenSub(null);
		root.state.triggerRef.current?.focus({ preventScroll: true });
	}, [setOpenSub, root.state.triggerRef]);
	const sub = useMemo(() => ({ ...root, id, back }), [root, id, back]);
	return <SubContext value={sub}>{children}</SubContext>;
}

export type DropdownMenuSubTriggerProps = Omit<ItemBaseProps, "shortcut" | "onSelect">;

/** The row that opens a submenu: on hover, a click, Enter, Space or ArrowRight. */
export function DropdownMenuSubTrigger({
	style,
	className,
	ref,
	onKeyDown,
	onClick,
	onPointerMove,
	...rest
}: DropdownMenuSubTriggerProps) {
	const sub = useSub("DropdownMenuSubTrigger");
	const level = useLevel("DropdownMenuSubTrigger");
	const open = sub.state.open;
	const show = (landing: Landing) => {
		sub.landing.current = landing;
		level.setOpenSub(sub.id);
	};
	return (
		<ItemBase
			{...rest}
			id={sub.triggerId}
			ref={mergeRefs(ref, (node: HTMLDivElement | null) => {
				sub.state.triggerRef.current = node;
			})}
			// The CSS names the row with this anchor, and with the highlight's while it is active.
			style={{ ...style, "--_anchor": sub.anchor } as CSSProperties}
			className={cn(menuParts.subTrigger, className)}
			aria-haspopup="menu"
			aria-expanded={open}
			aria-controls={sub.contentId}
			data-state={open ? "open" : "closed"}
			data-slot="dropdown-menu-sub-trigger"
			keepOpen
			onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
				onKeyDown?.(event);
				if (event.defaultPrevented || rest.disabled) return;
				if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					if (open) {
						const menu = sub.state.contentRef.current;
						if (menu) menuItems(menu)[0]?.focus();
					} else show("first");
				}
			}}
			onClick={(event: MouseEvent<HTMLDivElement>) => {
				onClick?.(event);
				if (!event.defaultPrevented && !rest.disabled && !open) show("stay");
			}}
			onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
				onPointerMove?.(event);
				if (!event.defaultPrevented && event.pointerType !== "touch" && !rest.disabled) {
					sub.landing.current = "stay";
					level.hover(sub.id);
				}
			}}
		/>
	);
}

export type DropdownMenuSubContentProps = MenuContentProps;

/** The submenu: beside its row, lined up with it, flipping to the other side when needed. */
export function DropdownMenuSubContent({
	side = "right",
	align = "start",
	sideOffset = 6,
	onPointerEnter,
	...rest
}: DropdownMenuSubContentProps) {
	const sub = useSub("DropdownMenuSubContent");
	const level = useLevel("DropdownMenuSubContent");
	return (
		<MenuPanel
			{...rest}
			root={sub}
			back={sub.back}
			side={side}
			align={align}
			sideOffset={sideOffset}
			slot="dropdown-menu-sub-content"
			onPointerEnter={(event) => {
				onPointerEnter?.(event);
				level.hold();
			}}
		/>
	);
}
