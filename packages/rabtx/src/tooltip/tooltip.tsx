"use client";

import {
	type ButtonHTMLAttributes,
	type CSSProperties,
	cloneElement,
	createContext,
	type FocusEvent,
	type HTMLAttributes,
	isValidElement,
	type MouseEvent,
	type PointerEvent,
	type ReactElement,
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
	useSyncExternalStore,
} from "react";
import { cn } from "../lib/utils";
import {
	anchorName,
	arrowOffset,
	fallbackPosition,
	placedSide,
	type TooltipAlign,
	type TooltipSide,
	tooltipClass,
	tooltipParts,
} from "./tooltip.styles";

/** How long the pointer may take to cross from the trigger onto the tooltip (and back). */
const GRACE_MS = 100;
/** The room an arrow adds to the gap (see `--_gap` in tooltip.css). */
const ARROW_PX = 6;
const DEFAULT_OFFSET = 6;

type Group = {
	/** When a tooltip of this provider last closed: inside the skip delay the next one is instant. */
	closedAt: number;
};

type ProviderValue = { delayDuration: number; skipDelayDuration: number; group: Group };

const ProviderContext = createContext<ProviderValue>({
	delayDuration: 120,
	skipDelayDuration: 300,
	group: { closedAt: Number.NEGATIVE_INFINITY },
});

/** Only one tooltip shows at a time: a hovered one replaces a keyboard-focused one and back. */
let shown: { close: () => void } | null = null;

export type TooltipProviderProps = {
	/** Hover time before a tooltip opens, in ms. Keyboard focus opens at once. Default 120. */
	delayDuration?: number;
	/**
	 * After a tooltip closes, the next one opens with no delay for this long, in ms, so moving
	 * along a toolbar feels instant after the first label. Default 300.
	 */
	skipDelayDuration?: number;
	children?: ReactNode;
};

/** Shared timing for the tooltips inside it. Optional: a tooltip works without one. */
export function TooltipProvider({
	delayDuration = 120,
	skipDelayDuration = 300,
	children,
}: TooltipProviderProps) {
	const [group] = useState<Group>(() => ({ closedAt: Number.NEGATIVE_INFINITY }));
	const value = useMemo(
		() => ({ delayDuration, skipDelayDuration, group }),
		[delayDuration, skipDelayDuration, group],
	);
	return <ProviderContext value={value}>{children}</ProviderContext>;
}

type TriggerHandlers = {
	onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
	onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
	onPointerDown: (event: PointerEvent<HTMLElement>) => void;
	onClick: (event: MouseEvent<HTMLElement>) => void;
	onFocus: (event: FocusEvent<HTMLElement>) => void;
	onBlur: (event: FocusEvent<HTMLElement>) => void;
};

type TooltipContextValue = {
	open: boolean;
	contentId: string;
	anchor: string;
	asLabel: boolean;
	hasContent: boolean;
	/** TooltipContent registers itself, so the trigger only points at a tooltip that exists. */
	register: (mounted: boolean) => void;
	triggerRef: RefObject<HTMLElement | null>;
	contentRef: RefObject<HTMLElement | null>;
	trigger: TriggerHandlers;
	content: {
		onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
		onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
	};
	/** Records a state the browser reached on its own (light dismiss, an interest invoker). */
	sync: (open: boolean) => void;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltip(part: string) {
	const context = use(TooltipContext);
	if (!context) throw new Error(`${part} must be used inside <Tooltip>`);
	return context;
}

/** Writes a node to every ref it is given (an object ref, a callback ref, or none). */
function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
	return (node: T | null) => {
		for (const ref of refs) {
			if (typeof ref === "function") ref(node);
			else if (ref) ref.current = node;
		}
	};
}

/** Runs the consumer's handler first; ours runs unless it called `preventDefault()`. */
function compose<E extends { defaultPrevented: boolean }>(
	theirs: ((event: E) => void) | undefined,
	ours: (event: E) => void,
) {
	return (event: E) => {
		theirs?.(event);
		if (!event.defaultPrevented) ours(event);
	};
}

const noop = () => () => {};
/** False on the server and while hydrating, true after: React keeps both renders consistent. */
const useHydrated = () =>
	useSyncExternalStore(
		noop,
		() => true,
		() => false,
	);

let anchoring: boolean | undefined;
/** Whether CSS anchor positioning places the tooltip, or the component has to. */
function anchorSupported() {
	anchoring ??= typeof CSS !== "undefined" && CSS.supports("position-area", "top");
	return anchoring;
}

/** `:popover-open` is an invalid selector where the Popover API is missing. */
function isShown(element: HTMLElement) {
	try {
		return element.matches(":popover-open");
	} catch {
		return element.dataset.state === "open";
	}
}

export type TooltipProps = {
	/** Controlled open state; pair it with `onOpenChange`. */
	open?: boolean;
	/** The state on first render, when uncontrolled. */
	defaultOpen?: boolean;
	/** Called with the next state, whatever opened or closed it. */
	onOpenChange?: (open: boolean) => void;
	/** Hover time before it opens, in ms. Defaults to the provider's `delayDuration`. */
	delayDuration?: number;
	/** Never show, for example while the label it repeats is already on screen. */
	disabled?: boolean;
	/**
	 * Use the tooltip as the trigger's accessible name instead of its description: for an
	 * icon-only button whose only label is the tooltip.
	 */
	asLabel?: boolean;
	children?: ReactNode;
};

/**
 * Holds one tooltip's state and timing and wires its trigger to its content. It opens on hover
 * after the delay (at once inside the provider's skip delay), on keyboard focus at once, and on a
 * tap on touch screens; it closes when the pointer leaves both the trigger and the tooltip, on
 * blur, on Escape, on a press, and when the window loses focus.
 */
export function Tooltip({
	open: openProp,
	defaultOpen = false,
	onOpenChange,
	delayDuration,
	disabled = false,
	asLabel = false,
	children,
}: TooltipProps) {
	const provider = use(ProviderContext);
	const id = useId();
	const [internal, setInternal] = useState(defaultOpen);
	// Assume a TooltipContent until the first layout says otherwise, so the server markup already
	// links the trigger to it.
	const [hasContent, setHasContent] = useState(true);
	const contentMounted = useRef(false);
	const controlled = openProp !== undefined;
	const open = controlled ? openProp : internal;
	const triggerRef = useRef<HTMLElement>(null);
	const contentRef = useRef<HTMLElement>(null);

	// Everything the handlers read, current between renders.
	const latest = useRef({
		open,
		controlled,
		onOpenChange,
		disabled,
		delay: delayDuration ?? provider.delayDuration,
		skip: provider.skipDelayDuration,
		group: provider.group,
	});
	useLayoutEffect(() => {
		latest.current = {
			open,
			controlled,
			onOpenChange,
			disabled,
			delay: delayDuration ?? provider.delayDuration,
			skip: provider.skipDelayDuration,
			group: provider.group,
		};
	});

	const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	/** A mouse press hides the label until the pointer leaves the trigger. */
	const suppressed = useRef(false);
	/** Opened by keyboard focus: the pointer leaving does not close it, blur does. */
	const byFocus = useRef(false);
	/** The pointer type and open state at the last press, so a tap can toggle. */
	const press = useRef<{ type: string; wasOpen: boolean } | null>(null);
	const self = useRef({ close: () => {} });

	const clearTimers = useCallback(() => {
		clearTimeout(openTimer.current);
		clearTimeout(closeTimer.current);
	}, []);

	const commit = useCallback((next: boolean) => {
		const state = latest.current;
		if (state.open === next) return;
		state.open = next;
		if (!state.controlled) setInternal(next);
		state.onOpenChange?.(next);
	}, []);

	const show = useCallback(() => {
		clearTimers();
		if (latest.current.disabled) return;
		if (shown && shown !== self.current) shown.close();
		shown = self.current;
		commit(true);
	}, [clearTimers, commit]);

	const hide = useCallback(() => {
		clearTimers();
		byFocus.current = false;
		if (latest.current.open) latest.current.group.closedAt = Date.now();
		if (shown === self.current) shown = null;
		commit(false);
	}, [clearTimers, commit]);

	useLayoutEffect(() => {
		self.current.close = hide;
	}, [hide]);

	const requestShow = useCallback(() => {
		clearTimers();
		const state = latest.current;
		if (state.open || state.disabled) return;
		// Warm: another label is still showing, or one closed a moment ago.
		const warm =
			(shown !== null && shown !== self.current) || Date.now() - state.group.closedAt < state.skip;
		if (warm || state.delay <= 0) show();
		else openTimer.current = setTimeout(show, state.delay);
	}, [clearTimers, show]);

	const requestHide = useCallback(() => {
		clearTimeout(openTimer.current);
		clearTimeout(closeTimer.current);
		if (!latest.current.open) return;
		closeTimer.current = setTimeout(hide, GRACE_MS);
	}, [hide]);

	const sync = useCallback(
		(next: boolean) => {
			if (next === latest.current.open) return;
			if (next) show();
			else hide();
		},
		[show, hide],
	);

	// While open: Escape closes it (and only it, so a dialog around it stays), a press outside
	// closes it (a tap elsewhere on a phone), and so does the window losing focus.
	useEffect(() => {
		if (!open) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return;
			// Cancelling the key stops the browser's close request, which would also close a dialog.
			event.preventDefault();
			hide();
		};
		const onPointerDown = (event: globalThis.PointerEvent) => {
			const target = event.target as Node | null;
			if (triggerRef.current?.contains(target) || contentRef.current?.contains(target)) return;
			hide();
		};
		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("pointerdown", onPointerDown, true);
		window.addEventListener("blur", hide);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("pointerdown", onPointerDown, true);
			window.removeEventListener("blur", hide);
		};
	}, [open, hide]);

	// Children's layout effects run first: by now a TooltipContent has registered, if there is one.
	useLayoutEffect(() => {
		if (!contentMounted.current) setHasContent(false);
	}, []);

	useEffect(() => {
		if (disabled) hide();
	}, [disabled, hide]);

	useEffect(
		() => () => {
			clearTimers();
			if (shown === self.current) shown = null;
		},
		[clearTimers],
	);

	const trigger = useMemo<TriggerHandlers>(
		() => ({
			onPointerEnter: (event) => {
				// A finger has no hover; a tap toggles instead (onClick).
				if (event.pointerType === "touch") return;
				clearTimeout(closeTimer.current);
				if (!suppressed.current) requestShow();
			},
			onPointerLeave: (event) => {
				if (event.pointerType === "touch") return;
				suppressed.current = false;
				if (byFocus.current) {
					clearTimeout(openTimer.current);
					return;
				}
				requestHide();
			},
			onPointerDown: (event) => {
				press.current = { type: event.pointerType, wasOpen: latest.current.open };
				if (event.pointerType !== "touch") {
					suppressed.current = true;
					hide();
				}
			},
			onClick: () => {
				// Only a tap toggles. A mouse press already closed it; a key press has no pointer.
				const last = press.current;
				press.current = null;
				if (last?.type !== "touch") return;
				if (last.wasOpen) hide();
				else show();
			},
			onFocus: (event) => {
				// A focus from a mouse press is not a request to read the label; a keyboard focus is.
				if (!event.currentTarget.matches(":focus-visible")) return;
				byFocus.current = true;
				show();
			},
			onBlur: () => hide(),
		}),
		[requestShow, requestHide, show, hide],
	);

	const content = useMemo(
		() => ({
			onPointerEnter: () => clearTimeout(closeTimer.current),
			onPointerLeave: (event: PointerEvent<HTMLElement>) => {
				if (event.pointerType === "touch" || byFocus.current) return;
				requestHide();
			},
		}),
		[requestHide],
	);

	const register = useCallback((mounted: boolean) => {
		contentMounted.current = mounted;
		setHasContent(mounted);
	}, []);

	const value = useMemo<TooltipContextValue>(
		() => ({
			open,
			contentId: `${id}-tooltip`,
			anchor: anchorName(id),
			asLabel,
			hasContent,
			register,
			triggerRef,
			contentRef,
			trigger,
			content,
			sync,
		}),
		[open, id, asLabel, hasContent, register, trigger, content, sync],
	);

	return <TooltipContext value={value}>{children}</TooltipContext>;
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

const joinIds = (...ids: unknown[]) =>
	ids.filter((value) => typeof value === "string" && value).join(" ") || undefined;

export type TooltipTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	/**
	 * Merge into the one child element instead of rendering a button: our `Button`, a link, an
	 * icon. The child must forward its props and ref to a focusable element.
	 */
	asChild?: boolean;
	ref?: Ref<HTMLButtonElement>;
};

type Handler<E> = ((event: E) => void) | undefined;

/**
 * What the tooltip describes (or names, with `asLabel`). It is the anchor the tooltip is placed
 * against. Until the page hydrates it also carries `interestfor`, so where Interest Invokers exist
 * the tooltip already shows on hover and focus without JavaScript.
 */
export function TooltipTrigger({ asChild, children, ref, ...rest }: TooltipTriggerProps) {
	const tooltip = useTooltip("TooltipTrigger");
	const hydrated = useHydrated();
	const only = useResolvedChild(children);
	const child =
		asChild && isValidElement(only)
			? (only as ReactElement<Record<string, unknown> & { ref?: Ref<HTMLElement> }>)
			: null;
	const own = (child?.props ?? rest) as Record<string, unknown>;
	const { trigger } = tooltip;

	const wired: Record<string, unknown> = {
		// Not in React's types yet; React passes lowercase attributes through.
		...(!hydrated && tooltip.hasContent ? { interestfor: tooltip.contentId } : {}),
		"data-slot": "tooltip-trigger",
		"data-state": tooltip.open ? "open" : "closed",
		"aria-describedby": joinIds(
			own["aria-describedby"],
			!tooltip.asLabel && tooltip.hasContent ? tooltip.contentId : undefined,
		),
		"aria-labelledby":
			tooltip.asLabel && tooltip.hasContent
				? tooltip.contentId
				: (own["aria-labelledby"] as string | undefined),
		style: { anchorName: tooltip.anchor, ...(own.style as CSSProperties | undefined) },
		onPointerEnter: compose(
			own.onPointerEnter as Handler<PointerEvent<HTMLElement>>,
			trigger.onPointerEnter,
		),
		onPointerLeave: compose(
			own.onPointerLeave as Handler<PointerEvent<HTMLElement>>,
			trigger.onPointerLeave,
		),
		onPointerDown: compose(
			own.onPointerDown as Handler<PointerEvent<HTMLElement>>,
			trigger.onPointerDown,
		),
		onClick: compose(own.onClick as Handler<MouseEvent<HTMLElement>>, trigger.onClick),
		onFocus: compose(own.onFocus as Handler<FocusEvent<HTMLElement>>, trigger.onFocus),
		onBlur: compose(own.onBlur as Handler<FocusEvent<HTMLElement>>, trigger.onBlur),
	};

	if (child) {
		return cloneElement(child, {
			...rest,
			...wired,
			// oxlint-disable-next-line react/refs -- the child's own ref prop, merged, not a ref's value
			ref: mergeRefs(ref as Ref<HTMLElement>, child.props.ref, tooltip.triggerRef),
		});
	}
	return (
		<button
			type="button"
			{...rest}
			{...wired}
			ref={mergeRefs(ref, tooltip.triggerRef as RefObject<HTMLButtonElement | null>)}
		>
			{children}
		</button>
	);
}

export type TooltipContentProps = HTMLAttributes<HTMLSpanElement> & {
	/** The preferred side. It flips to the opposite side when there is no room. Default `top`. */
	side?: TooltipSide;
	/** Alignment against the trigger along that side. Default `center`. */
	align?: TooltipAlign;
	/** The gap to the trigger, in px. Default 6 (plus the arrow, when shown). */
	sideOffset?: number;
	/** Draw an arrow pointing at the trigger. Default false. */
	arrow?: boolean;
	ref?: Ref<HTMLSpanElement>;
};

/**
 * The label: a `popover="hint"` element with `role="tooltip"`, in the top layer while shown and
 * placed against the trigger by CSS anchor positioning. It stays in the page while closed (hidden),
 * so the trigger's `aria-describedby` always resolves.
 */
export function TooltipContent({
	side = "top",
	align = "center",
	sideOffset,
	arrow = false,
	className,
	style,
	children,
	onPointerEnter,
	onPointerLeave,
	ref,
	...rest
}: TooltipContentProps) {
	const tooltip = useTooltip("TooltipContent");
	const { open, contentRef, triggerRef, register, sync } = tooltip;

	useLayoutEffect(() => {
		register(true);
		return () => register(false);
	}, [register]);

	// Reads where CSS put it: the side after any flip, and the arrow's offset along the edge.
	// Where anchor positioning is missing it places it first.
	const placement = useRef({ side, align, offset: sideOffset ?? DEFAULT_OFFSET, arrow });
	useLayoutEffect(() => {
		placement.current = { side, align, offset: sideOffset ?? DEFAULT_OFFSET, arrow };
	});
	const place = useCallback(() => {
		const element = contentRef.current;
		const anchor = triggerRef.current;
		if (!element || !anchor || !isShown(element)) return;
		const { side: preferred, align: alignment, offset, arrow: withArrow } = placement.current;
		const box = anchor.getBoundingClientRect();
		if (!anchorSupported()) {
			const root = document.documentElement;
			const at = fallbackPosition(
				box,
				{ width: element.offsetWidth, height: element.offsetHeight },
				{ width: root.clientWidth, height: root.clientHeight },
				{ side: preferred, align: alignment, offset: offset + (withArrow ? ARROW_PX : 0) },
			);
			element.style.setProperty("--_x", `${at.x}px`);
			element.style.setProperty("--_y", `${at.y}px`);
		}
		// Layout boxes, not getBoundingClientRect: the entrance scale must not skew the numbers.
		const left = element.offsetLeft;
		const top = element.offsetTop;
		const content = {
			left,
			top,
			right: left + element.offsetWidth,
			bottom: top + element.offsetHeight,
		};
		const placed = placedSide(box, content, preferred);
		const vertical = placed === "top" || placed === "bottom";
		const border = vertical ? element.clientLeft : element.clientTop;
		element.dataset.placed = placed;
		element.style.setProperty("--_arrow", `${arrowOffset(box, content, placed) - border}px`);
	}, [contentRef, triggerRef]);

	// State drives the element: show or hide it to match `open`. Opening twice or hiding a hidden
	// tooltip is a no-op.
	const wanted = useRef(open);
	const reconcile = useCallback(() => {
		const element = contentRef.current;
		if (!element) return;
		const showing = isShown(element);
		if (typeof element.showPopover !== "function") {
			if (wanted.current) place();
		} else if (wanted.current && !showing) {
			element.showPopover();
			place();
		} else if (!wanted.current && showing) {
			element.hidePopover();
		}
	}, [contentRef, place]);

	// On the first run, a tooltip an interest invoker opened before hydration is adopted rather
	// than closed.
	const adopted = useRef(false);
	useLayoutEffect(() => {
		wanted.current = open;
		const element = contentRef.current;
		if (!adopted.current && element) {
			adopted.current = true;
			if (isShown(element) && !open) {
				sync(true);
				return;
			}
		}
		reconcile();
	}, [open, contentRef, sync, reconcile]);

	// The browser can close a hint popover itself (a press elsewhere, another hint opening). Record
	// it, then, once React has applied the change, put the element back in line with `open`: a
	// controlled tooltip that is held open stays open.
	useEffect(() => {
		const element = contentRef.current;
		if (!element) return;
		let frame = 0;
		const onToggle = (event: Event) => {
			if (event.target !== element) return;
			sync((event as ToggleEvent).newState === "open");
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(reconcile);
		};
		element.addEventListener("toggle", onToggle);
		return () => {
			cancelAnimationFrame(frame);
			element.removeEventListener("toggle", onToggle);
		};
	}, [contentRef, sync, reconcile]);

	// While open, follow scrolling and resizing: CSS moves it, this keeps the arrow on the trigger.
	useEffect(() => {
		if (!open) return;
		let frame = 0;
		const schedule = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(place);
		};
		window.addEventListener("scroll", schedule, { capture: true, passive: true });
		window.addEventListener("resize", schedule);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", schedule, { capture: true });
			window.removeEventListener("resize", schedule);
		};
	}, [open, place]);

	return (
		<span
			{...rest}
			ref={mergeRefs(ref, contentRef as RefObject<HTMLSpanElement | null>)}
			id={tooltip.contentId}
			// An unknown popover value means `manual`, so browsers without `hint` still get a popover.
			popover="hint"
			role="tooltip"
			// As the trigger's name it is already read with the trigger; do not announce it twice.
			aria-hidden={tooltip.asLabel || undefined}
			data-slot="tooltip-content"
			data-state={open ? "open" : "closed"}
			data-side={side}
			data-align={align}
			data-arrow={arrow ? "" : undefined}
			className={cn(tooltipClass(), className)}
			style={
				{
					positionAnchor: tooltip.anchor,
					...(sideOffset === undefined ? {} : { "--_offset": `${sideOffset}px` }),
					...style,
				} as CSSProperties
			}
			onPointerEnter={compose(onPointerEnter, tooltip.content.onPointerEnter)}
			onPointerLeave={compose(onPointerLeave, tooltip.content.onPointerLeave)}
		>
			{children}
			{arrow ? <span className={tooltipParts.arrow} aria-hidden="true" /> : null}
		</span>
	);
}

export type TooltipKbdProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
	/** The key or keys, such as `⌘` or `K`. */
	children: string;
	ref?: Ref<HTMLElement>;
};

/**
 * A keyboard shortcut inside the label, as a small key cap. The key is drawn by CSS generated
 * content with empty alternative text (`content: attr(data-key) / ""`), so it is seen but never
 * read: the tooltip's name or description stays the words, even though a hidden element that
 * `aria-labelledby` points at is read in full. Announce the shortcut with `aria-keyshortcuts` on
 * the trigger instead.
 */
export function TooltipKbd({ className, children, ...rest }: TooltipKbdProps) {
	return (
		<kbd
			{...rest}
			data-key={children}
			data-slot="tooltip-kbd"
			className={cn(tooltipParts.kbd, className)}
		/>
	);
}
