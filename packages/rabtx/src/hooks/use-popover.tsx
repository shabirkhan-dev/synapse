"use client";

import {
	cloneElement,
	type CSSProperties,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type Ref,
	type SyntheticEvent,
	use,
	useCallback,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";

/**
 * The shared plumbing of every anchored popover in the library (Popover, DropdownMenu and its
 * submenus, ContextMenu). The browser does the hard parts through the Popover API: the top layer,
 * light dismiss, Escape, nesting and giving focus back. This keeps a React state in step with it
 * and names the anchor that CSS anchor positioning places the panel against.
 */

/** The side of the anchor the panel opens on. */
export type PopoverSide = "top" | "right" | "bottom" | "left";
/** Where the panel lines up along that side: its start edge, centered, or its end edge. */
export type PopoverAlign = "start" | "center" | "end";

export const popoverSides = [
	"top",
	"right",
	"bottom",
	"left",
] as const satisfies readonly PopoverSide[];
export const popoverAligns = ["start", "center", "end"] as const satisfies readonly PopoverAlign[];

/** A CSS anchor name (a dashed ident) from a React id, which may hold characters an ident cannot. */
export function anchorName(id: string) {
	return `--anchor-${id.replace(/[^\w-]/g, "")}`;
}

/** Writes a node to every ref it is given (an object ref, a callback ref, or none). */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
	return (node: T | null) => {
		for (const ref of refs) {
			if (typeof ref === "function") ref(node);
			else if (ref) ref.current = node;
		}
	};
}

type Handler = (event: SyntheticEvent) => void;

/** Calls the child's own handler first, then ours unless the child prevented it. */
function chain(theirs: unknown, ours: unknown): Handler | undefined {
	if (typeof ours !== "function") return theirs as Handler | undefined;
	if (typeof theirs !== "function") return ours as Handler;
	return (event) => {
		(theirs as Handler)(event);
		if (!event.defaultPrevented) (ours as Handler)(event);
	};
}

const LAZY = Symbol.for("react.lazy");

/**
 * An element a Server Component passes down can arrive as a lazy reference to a chunk that is still
 * streaming. Unwrap it, so `asChild` sees the element itself on the server and the client alike.
 */
function useResolvedChild(children: ReactNode): ReactNode {
	if (
		children !== null &&
		typeof children === "object" &&
		(children as { $$typeof?: symbol }).$$typeof === LAZY &&
		"_payload" in children
	) {
		// oxlint-disable-next-line no-underscore-dangle -- React's own field for a lazy element's payload
		return use(children._payload as PromiseLike<ReactNode> as Promise<ReactNode>);
	}
	return children;
}

type SlotProps = Record<string, unknown> & {
	asChild?: boolean;
	children?: ReactNode;
	ref?: Ref<HTMLElement>;
	style?: CSSProperties;
};

/**
 * Renders a `<button type="button">` with these props, or with `asChild` merges them into its one
 * child (such as our `Button`): handlers chain, styles and refs merge. The child must forward its
 * props and ref to a button, so `popovertarget` keeps working.
 */
export function Slot({ asChild, children, ref, style, ...rest }: SlotProps) {
	const only = useResolvedChild(children);
	if (asChild && isValidElement(only)) {
		const child = only as ReactElement<SlotProps>;
		const merged: Record<string, unknown> = { ...rest };
		for (const [key, value] of Object.entries(rest)) {
			if (/^on[A-Z]/.test(key)) merged[key] = chain(child.props[key], value);
		}
		return cloneElement(child, {
			...merged,
			style: { ...style, ...child.props.style },
			// oxlint-disable-next-line react/refs -- the child's own ref prop, merged, not a ref's value
			ref: mergeRefs(ref, child.props.ref),
		});
	}
	return (
		<button type="button" {...rest} style={style} ref={ref as Ref<HTMLButtonElement>}>
			{children}
		</button>
	);
}

export type PopoverStateOptions = {
	/** Controlled open state; pair it with `onOpenChange`. */
	open?: boolean;
	/** The state on first render, when uncontrolled. */
	defaultOpen?: boolean;
	/** Called with the next state, whatever changed it (the trigger, Escape, a press outside). */
	onOpenChange?: (open: boolean) => void;
};

export type PopoverState = {
	open: boolean;
	/** The `[popover]` element. */
	contentRef: { current: HTMLElement | null };
	/** The element that opens it and gets focus back. */
	triggerRef: { current: HTMLElement | null };
	/** The element it is placed against, when that is not the trigger (a context menu's point). */
	anchorRef: { current: HTMLElement | null };
	/** Ask for a state; the element follows on the next commit. */
	setOpen: (open: boolean) => void;
	/** Pass to the `[popover]` element's `onToggle`: records changes the browser made. */
	onToggle: (event: SyntheticEvent<HTMLElement> & { newState?: string }) => void;
	/** Pass to the `[popover]` element's `onBeforeToggle`: finds which way it flipped as it opens. */
	onBeforeToggle: (event: SyntheticEvent<HTMLElement> & { newState?: string }) => void;
	/** Runs once each time the panel has opened, after the browser shows it. */
	onShown: { current: ((element: HTMLElement) => void) | null };
};

const isOpen = (element: HTMLElement) => element.matches(":popover-open");

type Box = { top: number; right: number; bottom: number; left: number };

const middle = (a: number, b: number) => (a + b) / 2;

/**
 * Which way `position-try-fallbacks` flipped a panel, from where it landed against its anchor:
 * `block` (top and bottom swapped), `inline` (left and right swapped), both, or none (""). The
 * axis across the side is the side itself; the axis along it is the alignment, which a flip moves
 * to the other edge. `popover.css` mirrors the point the panel unfolds from to match.
 */
export function flipOf({
	side,
	align,
	panel,
	anchor,
}: {
	side: PopoverSide;
	align: PopoverAlign;
	panel: Box;
	anchor: Box;
}): "" | "block" | "inline" | "block inline" {
	const vertical = side === "top" || side === "bottom";
	// Across: the panel ended up on the other side of the anchor's middle.
	const across = vertical
		? middle(panel.top, panel.bottom) < middle(anchor.top, anchor.bottom) === (side === "bottom")
		: middle(panel.left, panel.right) < middle(anchor.left, anchor.right) === (side === "right");
	// Along: an edge-aligned panel now hangs past the anchor's opposite edge.
	const [start, end, anchorStart, anchorEnd] = vertical
		? [panel.left, panel.right, anchor.left, anchor.right]
		: [panel.top, panel.bottom, anchor.top, anchor.bottom];
	const along =
		(align === "start" && start < anchorStart - 0.5) || (align === "end" && end > anchorEnd + 0.5);
	const block = vertical ? across : along;
	const inline = vertical ? along : across;
	return block && inline ? "block inline" : block ? "block" : inline ? "inline" : "";
}

/**
 * Holds a popover's open state and keeps the `[popover]` element in step with it, both ways: the
 * state shows and hides the element, and every change the browser makes on its own (an invoker, a
 * press outside, Escape, a parent closing) comes back through `onToggle`. A controlled `open` that
 * refuses a change puts the element back.
 */
export function usePopoverState({
	open: openProp,
	defaultOpen = false,
	onOpenChange,
}: PopoverStateOptions): PopoverState {
	const [internal, setInternal] = useState(defaultOpen);
	const controlled = openProp !== undefined;
	const open = controlled ? openProp : internal;
	const contentRef = useRef<HTMLElement | null>(null);
	const triggerRef = useRef<HTMLElement | null>(null);
	const anchorRef = useRef<HTMLElement | null>(null);
	const onShown = useRef<((element: HTMLElement) => void) | null>(null);
	// A change the parent declined still needs one more pass to put the element back.
	const [tick, recheck] = useReducer((n: number) => n + 1, 0);

	// The last committed state, for event handlers that run between renders.
	const current = useRef(open);
	useLayoutEffect(() => {
		current.current = open;
	}, [open]);

	const setOpen = useCallback(
		(next: boolean) => {
			if (next !== current.current) {
				if (!controlled) setInternal(next);
				onOpenChange?.(next);
			}
			recheck();
		},
		[controlled, onOpenChange],
	);

	useLayoutEffect(() => {
		const element = contentRef.current;
		if (!element?.isConnected) return;
		if (open && !isOpen(element)) {
			// `source` makes the trigger the invoker: a press on it is not a press outside, and it gets
			// focus back. Browsers without the option ignore it.
			// `source` ties the popover to its invoker (focus return, nesting). Typed loosely, as older
			// DOM typings take no argument.
			(element.showPopover as (options?: { source?: HTMLElement }) => void).call(element, {
				source: triggerRef.current ?? undefined,
			});
		} else if (!open && isOpen(element)) {
			element.hidePopover();
		}
		// oxlint-disable-next-line react/exhaustive-effect-dependencies -- `tick` re-runs it after a refused change
	}, [open, tick]);

	const onToggle = useCallback(
		(event: SyntheticEvent<HTMLElement> & { newState?: string }) => {
			// Toggle events do not bubble, but React delivers a nested popover's to its parents too.
			if (event.target !== event.currentTarget) return;
			const element = event.currentTarget;
			const shown = isOpen(element);
			if (shown !== current.current) setOpen(shown);
			if (shown) onShown.current?.(element);
			else {
				// The browser gives focus back only from the first popover of a stack; a nested one
				// (a submenu) leaves it on the page. Give it back to the trigger when it was inside.
				const active = document.activeElement;
				if (!active || active === document.body || element.contains(active))
					triggerRef.current?.focus({ preventScroll: true });
			}
		},
		[setOpen],
	);

	const onBeforeToggle = useCallback(
		(event: SyntheticEvent<HTMLElement> & { newState?: string }) => {
			if (event.target !== event.currentTarget || event.newState !== "open") return;
			const element = event.currentTarget;
			// The popover is shown right after this event and laid out in the next frame. Read where
			// it landed then, before that frame paints, so it unfolds from the right corner.
			requestAnimationFrame(() => {
				const anchor = anchorRef.current ?? triggerRef.current;
				if (!anchor || !isOpen(element)) return;
				const flip = flipOf({
					side: (element.dataset.side ?? "bottom") as PopoverSide,
					align: (element.dataset.align ?? "center") as PopoverAlign,
					panel: element.getBoundingClientRect(),
					anchor: anchor.getBoundingClientRect(),
				});
				if (flip) element.dataset.flip = flip;
				else delete element.dataset.flip;
			});
		},
		[],
	);

	return useMemo(
		() => ({ open, contentRef, triggerRef, anchorRef, setOpen, onToggle, onBeforeToggle, onShown }),
		[open, setOpen, onToggle, onBeforeToggle],
	);
}

/** The first element inside that takes focus from the keyboard, if any. */
export function firstFocusable(root: HTMLElement): HTMLElement | null {
	return root.querySelector<HTMLElement>(
		'[autofocus], button:not(:disabled), [href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]',
	);
}
