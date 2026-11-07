"use client";

import {
	cloneElement,
	createContext,
	type HTMLAttributes,
	isValidElement,
	type MouseEvent,
	type ReactElement,
	type ReactNode,
	type Ref,
	type RefObject,
	use,
	useMemo,
	useRef,
} from "react";
import { mergeRefs, type PopoverStateOptions } from "../hooks/use-popover";
import {
	type MenuContentProps,
	MenuPanel,
	MenuProvider,
	type MenuRoot,
	useMenuState,
} from "./dropdown-menu";
import { menuParts } from "./dropdown-menu.styles";

const ContextMenuContext = createContext<{
	root: MenuRoot;
	point: RefObject<HTMLSpanElement | null>;
} | null>(null);

function useContextMenu(part: string) {
	const context = use(ContextMenuContext);
	if (!context) throw new Error(`${part} must be used inside <ContextMenu>`);
	return context;
}

export type ContextMenuProps = PopoverStateOptions & { children?: ReactNode };

/**
 * A menu that opens at the pointer on a right-click (or the keyboard's menu key, Shift+F10) over
 * its trigger area. The same menu as DropdownMenu, with the same rows, keys and motion; it is
 * anchored to an invisible point where the press was, and unfolds from it.
 */
export function ContextMenu({ children, ...options }: ContextMenuProps) {
	const root = useMenuState(options, false);
	const point = useRef<HTMLSpanElement>(null);
	const { anchorRef } = root.state;
	const value = useMemo(() => ({ root, point }), [root]);
	return (
		<ContextMenuContext value={value}>
			<MenuProvider root={root}>
				{children}
				<span
					ref={mergeRefs(point, anchorRef)}
					className={menuParts.point}
					style={{ anchorName: root.anchor }}
					aria-hidden="true"
				/>
			</MenuProvider>
		</ContextMenuContext>
	);
}

export type ContextMenuTriggerProps = HTMLAttributes<HTMLDivElement> & {
	/** Use the one child element as the area instead of a `<div>`. */
	asChild?: boolean;
	/** Leave the browser's own context menu in place. */
	disabled?: boolean;
	ref?: Ref<HTMLDivElement>;
};

/** The area a right-click opens the menu over. */
export function ContextMenuTrigger({
	asChild,
	disabled,
	onContextMenu,
	children,
	ref,
	...rest
}: ContextMenuTriggerProps) {
	const { root, point } = useContextMenu("ContextMenuTrigger");
	const open = (event: MouseEvent<HTMLElement>) => {
		if (disabled || event.defaultPrevented) return;
		event.preventDefault();
		// The menu key and Shift+F10 fire with no pointer: open below the focused element instead,
		// and land on the first row.
		const native = event.nativeEvent as { pointerType?: string };
		const keyboard = event.button < 0 || native.pointerType === "";
		let { clientX: x, clientY: y } = event;
		if (keyboard || (x === 0 && y === 0)) {
			const rect = (event.target as Element).getBoundingClientRect();
			x = rect.left;
			y = rect.bottom;
		}
		const at = point.current;
		if (at) {
			at.style.left = `${x}px`;
			at.style.top = `${y}px`;
		}
		root.landing.current = keyboard ? "first" : "menu";
		root.state.triggerRef.current = event.currentTarget;
		// A second right-click moves an open menu to the new point.
		root.state.contentRef.current?.hidePopover?.();
		root.state.setOpen(true);
	};
	const shared = {
		...rest,
		"data-state": root.state.open ? "open" : "closed",
		"data-slot": "context-menu-trigger",
	};
	if (asChild && isValidElement(children)) {
		const child = children as ReactElement<
			HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }
		>;
		return cloneElement(child, {
			...shared,
			// oxlint-disable-next-line react/refs -- the child's own ref prop, merged, not a ref's value
			ref: mergeRefs(ref as Ref<HTMLElement>, child.props.ref),
			onContextMenu: (event: MouseEvent<HTMLElement>) => {
				child.props.onContextMenu?.(event);
				onContextMenu?.(event as MouseEvent<HTMLDivElement>);
				open(event);
			},
		});
	}
	return (
		<div
			{...shared}
			ref={ref}
			onContextMenu={(event) => {
				onContextMenu?.(event);
				open(event);
			}}
		>
			{children}
		</div>
	);
}

export type ContextMenuContentProps = MenuContentProps;

/** The menu: opens below and after the pointer, and flips when it would not fit. */
export function ContextMenuContent({
	side = "bottom",
	align = "start",
	sideOffset = 2,
	...rest
}: ContextMenuContentProps) {
	const { root } = useContextMenu("ContextMenuContent");
	return (
		<MenuPanel
			aria-label="Context menu"
			{...rest}
			root={root}
			side={side}
			align={align}
			sideOffset={sideOffset}
			slot="context-menu-content"
		/>
	);
}

// The rows are the dropdown menu's own.
export {
	DropdownMenuCheckboxItem as ContextMenuCheckboxItem,
	type DropdownMenuCheckboxItemProps as ContextMenuCheckboxItemProps,
	DropdownMenuGroup as ContextMenuGroup,
	DropdownMenuItem as ContextMenuItem,
	type DropdownMenuItemProps as ContextMenuItemProps,
	DropdownMenuLabel as ContextMenuLabel,
	DropdownMenuRadioGroup as ContextMenuRadioGroup,
	type DropdownMenuRadioGroupProps as ContextMenuRadioGroupProps,
	DropdownMenuRadioItem as ContextMenuRadioItem,
	type DropdownMenuRadioItemProps as ContextMenuRadioItemProps,
	DropdownMenuSeparator as ContextMenuSeparator,
	DropdownMenuShortcut as ContextMenuShortcut,
	DropdownMenuSub as ContextMenuSub,
	DropdownMenuSubContent as ContextMenuSubContent,
	DropdownMenuSubTrigger as ContextMenuSubTrigger,
} from "./dropdown-menu";
