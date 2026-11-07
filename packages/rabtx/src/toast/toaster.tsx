"use client";

import {
	type CSSProperties,
	type KeyboardEvent,
	type MouseEvent,
	type PointerEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { Button } from "../button/button";
import { cn } from "../lib/utils";
import {
	DEFAULT_TOASTER,
	type ToastButton,
	type ToastData,
	type ToastId,
	type ToastType,
	toastStore,
} from "./toast-store";
import {
	dampSwipe,
	hotkeyLabel,
	matchesHotkey,
	splitPosition,
	stackOffsets,
	swipeDismisses,
	type ToasterPosition,
	toastParts,
} from "./toast.styles";

// One import for both halves: the Toaster and toast() come from this file.
export { toast } from "./toast-store";

export type ToasterProps = {
	/** Pairs with `toast(…, { toaster })` when a page has more than one region. */
	id?: string;
	/** Which corner or edge the stack sits on. Default `bottom-right`. */
	position?: ToasterPosition;
	/** Always fanned out, instead of only on hover and focus. */
	expand?: boolean;
	/** How many toasts show at once; the rest wait their turn. Default 3. */
	visibleToasts?: number;
	/** Space between fanned-out toasts, in px. Default 14. */
	gap?: number;
	/** Distance from the viewport edges, a CSS length or px. Default 24. */
	offset?: number | string;
	/** Default time on screen, in ms. Default 4000. */
	duration?: number;
	/** The close button on each dismissible toast. Default `true`. */
	closeButton?: boolean;
	/** Keys that move focus to the newest toast. Default `["F6", "Alt+T"]`. */
	hotkey?: string[];
	/** The region's name; the first hotkey is added to it. Default `"Notifications"`. */
	label?: string;
	/** The close button's accessible name. Default `"Dismiss"`. */
	closeLabel?: string;
	className?: string;
};

/** How long a leaving toast takes before it is removed, if its transition never reports. */
const EXIT_FALLBACK_MS = 400;
/** How long an announcement stays in the live region. */
const ANNOUNCE_MS = 7000;

const subscribe = toastStore.subscribe;
const snapshot = toastStore.getSnapshot;
const serverSnapshot = toastStore.getServerSnapshot;

type Announcement = { key: string; toast: ToastData; assertive: boolean };

/**
 * The region toasts appear in. Render it once (in a layout); `toast()` from anywhere fills it. It is
 * a `popover="manual"` element, so it sits in the top layer above dialogs and other popovers, and it
 * moves itself back on top whenever one of them opens.
 */
export function Toaster({
	id = DEFAULT_TOASTER,
	position = "bottom-right",
	expand = false,
	visibleToasts = 3,
	gap = 14,
	offset = 24,
	duration = 4000,
	closeButton = true,
	hotkey = DEFAULT_HOTKEY,
	label = "Notifications",
	closeLabel = "Dismiss",
	className,
}: ToasterProps) {
	const all = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
	const [token] = useState(() => Symbol(id));
	const [owner, setOwner] = useState(false);
	const sectionRef = useRef<HTMLElement>(null);
	const listRef = useRef<HTMLOListElement>(null);
	const lastFocus = useRef<HTMLElement | null>(null);
	const [heights, setHeights] = useState<ReadonlyMap<ToastId, number>>(() => new Map());
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	const [pressed, setPressed] = useState(false);
	const [hidden, setHidden] = useState(false);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	// Every toast on screen and its last place, so a leaving toast stays where it was.
	const [shown, setShown] = useState<ReadonlyMap<ToastId, number>>(() => new Map());
	const versions = useRef(new Map<ToastId, number>());
	const { y, x } = splitPosition(position);

	// One Toaster per id renders; the others wait for it to unmount.
	useEffect(() => {
		const check = () => setOwner(toastStore.claim(id, token));
		check();
		const unsubscribe = toastStore.subscribe(check);
		return () => {
			unsubscribe();
			toastStore.release(id, token);
		};
	}, [id, token]);

	const mine = useMemo(
		() => (owner ? all.filter((t) => (t.toaster ?? DEFAULT_TOASTER) === id) : []),
		[all, owner, id],
	);
	const active = useMemo(
		() => mine.filter((t) => !t.removing).slice(0, Math.max(1, visibleToasts)),
		[mine, visibleToasts],
	);
	const rendered = useMemo(
		() => mine.filter((t) => active.includes(t) || (t.removing && shown.has(t.id))),
		[mine, active, shown],
	);
	const placeOf = useCallback(
		(t: ToastData) => {
			const index = active.indexOf(t);
			return index === -1 ? (shown.get(t.id) ?? 0) : index;
		},
		[active, shown],
	);

	useLayoutEffect(() => {
		const next = new Map(rendered.map((t) => [t.id, placeOf(t)] as const));
		setShown((current) =>
			current.size === next.size && [...next].every(([key, at]) => current.get(key) === at)
				? current
				: next,
		);
		// A toast dismissed while it was still waiting its turn never showed, so it just goes.
		for (const t of mine) if (t.removing && !next.has(t.id)) toastStore.remove(t.id);
	}, [rendered, mine, placeOf]);

	// Announce each new toast, and each update, in the matching live region.
	useEffect(() => {
		const fresh: Announcement[] = [];
		for (const t of active) {
			if (versions.current.get(t.id) === t.version) continue;
			versions.current.set(t.id, t.version);
			fresh.push({
				key: `${t.id}-${t.version}`,
				toast: t,
				assertive: t.important === true || t.type === "error",
			});
		}
		if (!fresh.length) return;
		setAnnouncements((current) => [...current, ...fresh]);
		const timer = window.setTimeout(() => {
			const done = new Set(fresh.map((a) => a.key));
			setAnnouncements((current) => current.filter((a) => !done.has(a.key)));
		}, ANNOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [active]);

	// The region lives in the top layer, and climbs back on top when a dialog or popover opens.
	useEffect(() => {
		const section = sectionRef.current;
		if (!owner || !section || typeof section.showPopover !== "function") return;
		const show = () => {
			if (!section.matches(":popover-open")) section.showPopover();
		};
		const raise = () => {
			if (section.contains(document.activeElement)) return;
			if (section.matches(":popover-open")) section.hidePopover();
			section.showPopover();
		};
		show();
		const onToggle = (event: Event) => {
			// Another Toaster re-showing itself is not a reason to climb, or two would leapfrog forever.
			const target = event.target;
			if (!(target instanceof Element) || target.matches('[data-slot="toaster"]')) return;
			if ((event as ToggleEvent).newState === "open") raise();
		};
		const observer = new MutationObserver((records) => {
			if (records.some((r) => r.target instanceof HTMLDialogElement && r.target.open)) raise();
		});
		observer.observe(document.body, { attributes: true, attributeFilter: ["open"], subtree: true });
		document.addEventListener("toggle", onToggle, true);
		return () => {
			observer.disconnect();
			document.removeEventListener("toggle", onToggle, true);
			if (section.matches(":popover-open")) section.hidePopover();
		};
	}, [owner]);

	// Timers stop while the tab is hidden.
	useEffect(() => {
		const update = () => setHidden(document.visibilityState === "hidden");
		update();
		document.addEventListener("visibilitychange", update);
		return () => document.removeEventListener("visibilitychange", update);
	}, []);

	const focusFront = useCallback(() => {
		const first = listRef.current?.querySelector<HTMLElement>(
			`.${toastParts.toast}:not([data-removed])`,
		);
		if (!first) return false;
		const current = document.activeElement;
		if (current instanceof HTMLElement && !sectionRef.current?.contains(current)) {
			lastFocus.current = current;
		}
		first.focus();
		return true;
	}, []);

	// The hotkey jumps to the newest toast, as F6 jumps between a page's regions.
	useEffect(() => {
		if (!owner) return;
		const onKey = (event: globalThis.KeyboardEvent) => {
			if (!hotkey.some((key) => matchesHotkey(event, key))) return;
			if (focusFront()) event.preventDefault();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [owner, hotkey, focusFront]);

	/** Before a toast that holds focus leaves, focus moves to the next one, or back to the page. */
	const handOffFocus = useCallback((from: HTMLElement) => {
		if (!from.contains(document.activeElement)) return;
		// Array.from, not a spread, so projects without the DOM iterable lib still type-check.
		const next = Array.from(
			listRef.current?.querySelectorAll<HTMLElement>(`.${toastParts.toast}:not([data-removed])`) ??
				[],
		).find((el) => el !== from);
		if (next) next.focus();
		else if (lastFocus.current?.isConnected) lastFocus.current.focus();
		else from.blur();
	}, []);

	const onHeight = useCallback((toastId: ToastId, height: number) => {
		setHeights((current) => {
			if (current.get(toastId) === height) return current;
			const next = new Map(current);
			next.set(toastId, height);
			return next;
		});
	}, []);

	useEffect(() => {
		setHeights((current) => {
			const ids = new Set(rendered.map((t) => t.id));
			if ([...current.keys()].every((key) => ids.has(key))) return current;
			return new Map([...current].filter(([key]) => ids.has(key)));
		});
		if (!active.length) setFocused(false);
	}, [rendered, active.length]);

	const expanded = expand || hovered || focused || pressed;
	const paused = expanded || hidden;
	const offsets = stackOffsets(
		active.map((t) => heights.get(t.id) ?? 0),
		gap,
	);
	const frontHeight = heights.get(active[0]?.id ?? "") ?? 0;
	const lastActive = active.length - 1;
	const stackHeight =
		lastActive >= 0 ? offsets[lastActive] + (heights.get(active[lastActive].id) ?? 0) : 0;

	const style = {
		"--_gap": `${gap}px`,
		"--_edge": typeof offset === "number" ? `${offset}px` : offset,
		"--_front-h": `${frontHeight}px`,
		"--_stack-h": `${stackHeight}px`,
	} as CSSProperties;

	const name = hotkey.length ? `${label} (${hotkeyLabel(hotkey[0])})` : label;

	return (
		<section
			ref={sectionRef}
			popover="manual"
			aria-label={name}
			tabIndex={-1}
			data-slot="toaster"
			data-y={y}
			data-x={x}
			data-expanded={expanded ? "" : undefined}
			className={cn(toastParts.toaster, className)}
			style={style}
		>
			{/* The list tracks hover, presses and focus for the whole stack; each toast is focusable. */}
			{/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
			<ol
				ref={listRef}
				className={toastParts.list}
				onPointerEnter={(event) => {
					if (event.pointerType === "mouse") setHovered(true);
				}}
				onPointerLeave={(event) => {
					if (event.pointerType === "mouse") setHovered(false);
				}}
				onPointerDown={() => setPressed(true)}
				onPointerUp={() => setPressed(false)}
				onPointerCancel={() => setPressed(false)}
				onFocus={() => setFocused(true)}
				onBlur={(event) => {
					if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
				}}
			>
				{rendered.map((t) => {
					const at = placeOf(t);
					return (
						<Toast
							key={t.id}
							toast={t}
							index={at}
							offset={offsets[at] ?? 0}
							height={heights.get(t.id)}
							x={x}
							y={y}
							paused={paused}
							defaultDuration={duration}
							closeButton={closeButton}
							closeLabel={closeLabel}
							onHeight={onHeight}
							handOffFocus={handOffFocus}
						/>
					);
				})}
			</ol>
			<div className={toastParts.announcer} aria-live="polite" aria-atomic="false">
				{announcements
					.filter((a) => !a.assertive)
					.map((a) => (
						<Announce key={a.key} toast={a.toast} />
					))}
			</div>
			<div className={toastParts.announcer} aria-live="assertive" aria-atomic="false">
				{announcements
					.filter((a) => a.assertive)
					.map((a) => (
						<Announce key={a.key} toast={a.toast} />
					))}
			</div>
		</section>
	);
}

const DEFAULT_HOTKEY = ["F6", "Alt+T"];

function Announce({ toast }: { toast: ToastData }) {
	return (
		<p>
			{toast.title}
			{toast.description ? <> {toast.description}</> : null}
		</p>
	);
}

type ToastProps = {
	toast: ToastData;
	index: number;
	offset: number;
	height: number | undefined;
	x: "left" | "center" | "right";
	y: "top" | "bottom";
	paused: boolean;
	defaultDuration: number;
	closeButton: boolean;
	closeLabel: string;
	onHeight: (id: ToastId, height: number) => void;
	handOffFocus: (from: HTMLElement) => void;
};

type Swipe = { x: number; y: number; t: number; id: number; axis?: "x" | "y"; delta: number };

function Toast({
	toast,
	index,
	offset,
	height,
	x,
	y,
	paused,
	defaultDuration,
	closeButton,
	closeLabel,
	onHeight,
	handOffFocus,
}: ToastProps) {
	const ref = useRef<HTMLLIElement>(null);
	const bodyRef = useRef<HTMLDivElement>(null);
	const swipe = useRef<Swipe | null>(null);
	const remaining = useRef<number | null>(null);
	const version = useRef(toast.version);
	const [swipeOut, setSwipeOut] = useState<"left" | "right" | "up" | "down" | undefined>();
	const dismissible = toast.dismissible !== false;
	const duration = toast.duration ?? defaultDuration;
	const { id, removing } = toast;

	// Measure the content's own height; a collapsed toast clips it to the front toast's height.
	useLayoutEffect(() => {
		const body = bodyRef.current;
		if (!body) return;
		const measure = () => onHeight(id, body.offsetHeight);
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(measure);
		observer.observe(body);
		return () => observer.disconnect();
	}, [id, onHeight]);

	// The timer: it stops while paused and resumes with what was left; an update restarts it.
	useEffect(() => {
		if (version.current !== toast.version) {
			version.current = toast.version;
			remaining.current = null;
		}
		if (removing || paused || !Number.isFinite(duration) || duration <= 0) return;
		const left = remaining.current ?? duration;
		const started = Date.now();
		const timer = window.setTimeout(() => toastStore.dismiss(id, true), left);
		return () => {
			window.clearTimeout(timer);
			remaining.current = Math.max(0, left - (Date.now() - started));
		};
	}, [id, removing, paused, duration, toast.version]);

	// Once it starts to leave, remove it after its exit transition (or a fallback, when motion is off).
	useEffect(() => {
		const el = ref.current;
		if (!removing || !el) return;
		handOffFocus(el);
		const done = () => toastStore.remove(id);
		const onEnd = (event: TransitionEvent) => {
			if (event.target === el && event.propertyName === "opacity") done();
		};
		el.addEventListener("transitionend", onEnd);
		const timer = window.setTimeout(done, EXIT_FALLBACK_MS);
		return () => {
			el.removeEventListener("transitionend", onEnd);
			window.clearTimeout(timer);
		};
	}, [removing, id, handOffFocus]);

	const dismiss = () => {
		if (ref.current) handOffFocus(ref.current);
		toastStore.dismiss(id);
	};

	const press = (button: ToastButton) => (event: MouseEvent<HTMLButtonElement>) => {
		button.onClick?.(event);
		if (!event.defaultPrevented) dismiss();
	};

	const onKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
		if (event.key !== "Escape" || !dismissible) return;
		event.preventDefault();
		event.stopPropagation();
		dismiss();
	};

	// Swipe: the pointer writes CSS variables directly, so a drag never re-renders.
	const setVars = (dx: number, dy: number, progress: number) => {
		const el = ref.current;
		if (!el) return;
		el.style.setProperty("--_swipe-x", `${dx}px`);
		el.style.setProperty("--_swipe-y", `${dy}px`);
		el.style.setProperty("--_swipe-p", `${progress}`);
	};
	const clearVars = () => {
		const el = ref.current;
		if (!el) return;
		el.removeAttribute("data-swiping");
		for (const name of ["--_swipe-x", "--_swipe-y", "--_swipe-p"]) el.style.removeProperty(name);
	};
	const towardX = (delta: number): 1 | -1 =>
		x === "left" ? -1 : x === "right" ? 1 : delta < 0 ? -1 : 1;
	const towardY: 1 | -1 = y === "bottom" ? 1 : -1;

	const onPointerDown = (event: PointerEvent<HTMLLIElement>) => {
		if (!dismissible || removing || event.button !== 0) return;
		if ((event.target as Element).closest("button, a, input, textarea, select")) return;
		swipe.current = {
			x: event.clientX,
			y: event.clientY,
			t: event.timeStamp,
			id: event.pointerId,
			delta: 0,
		};
	};
	const onPointerMove = (event: PointerEvent<HTMLLIElement>) => {
		const s = swipe.current;
		const el = ref.current;
		if (!s || !el || s.id !== event.pointerId) return;
		const dx = event.clientX - s.x;
		const dy = event.clientY - s.y;
		if (!s.axis) {
			if (Math.hypot(dx, dy) < 4) return;
			s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
			el.setPointerCapture(event.pointerId);
			el.setAttribute("data-swiping", "");
			// A drag is not a selection.
			window.getSelection()?.removeAllRanges();
		}
		const size = s.axis === "x" ? el.offsetWidth : el.offsetHeight;
		s.delta = s.axis === "x" ? dampSwipe(dx, towardX(dx)) : dampSwipe(dy, towardY);
		const progress = Math.min(1, Math.abs(s.delta) / Math.max(size, 1));
		setVars(s.axis === "x" ? s.delta : 0, s.axis === "y" ? s.delta : 0, progress);
	};
	const onPointerUp = (event: PointerEvent<HTMLLIElement>) => {
		const s = swipe.current;
		swipe.current = null;
		if (!s?.axis || s.id !== event.pointerId) return;
		const toward = s.axis === "x" ? towardX(s.delta) : towardY;
		if (Math.sign(s.delta) === toward && swipeDismisses(s.delta, event.timeStamp - s.t)) {
			ref.current?.removeAttribute("data-swiping");
			setSwipeOut(s.axis === "x" ? (toward > 0 ? "right" : "left") : toward > 0 ? "down" : "up");
			dismiss();
		} else clearVars();
	};
	const onPointerCancel = () => {
		swipe.current = null;
		clearVars();
	};

	const style = {
		"--_i": index,
		"--_offset": `${offset}px`,
		...(height === undefined ? {} : { "--_h": `${height}px` }),
	} as CSSProperties;

	const icon =
		toast.icon !== undefined ? (
			toast.icon
		) : toast.type === "default" ? null : (
			<ToastIcon type={toast.type} />
		);

	return (
		// A toast is focusable like Sonner's, so Escape can dismiss it and the hotkey can reach it; the
		// pointer handlers are the swipe, which the keyboard does with Escape.
		// oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
		<li
			ref={ref}
			// oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
			tabIndex={0}
			data-slot="toast"
			data-type={toast.type}
			data-front={index === 0 ? "" : undefined}
			data-removed={removing ? "" : undefined}
			data-swipe-out={swipeOut}
			className={cn("rx-surface", toastParts.toast, toast.className)}
			style={style}
			onKeyDown={onKeyDown}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerCancel}
		>
			<div ref={bodyRef} className={toastParts.body}>
				{icon === null ? null : (
					<span key={toast.type} className={toastParts.icon} aria-hidden="true">
						{icon}
					</span>
				)}
				<div key={toast.version} className={toastParts.content}>
					<div className={toastParts.title}>{toast.title}</div>
					{toast.description ? (
						<div className={toastParts.description}>{toast.description}</div>
					) : null}
				</div>
				{toast.cancel || toast.action ? (
					<div className={toastParts.actions}>
						{toast.cancel ? (
							<Button size="sm" variant="ghost" onClick={press(toast.cancel)}>
								{toast.cancel.label}
							</Button>
						) : null}
						{toast.action ? (
							<Button size="sm" onClick={press(toast.action)}>
								{toast.action.label}
							</Button>
						) : null}
					</div>
				) : null}
			</div>
			{closeButton && dismissible && toast.type !== "loading" ? (
				<button
					type="button"
					className={toastParts.close}
					aria-label={closeLabel}
					onClick={dismiss}
				/>
			) : null}
		</li>
	);
}

/** The built-in glyphs, drawn inline so the component needs no icon set. */
function ToastIcon({ type }: { type: Exclude<ToastType, "default"> }): ReactNode {
	const paths: Record<Exclude<ToastType, "default" | "loading">, ReactNode> = {
		success: <path d="M6.5 12.5l3.5 3.5 7.5-8" pathLength={1} />,
		error: <path d="M8 8l8 8M16 8l-8 8" pathLength={1} />,
		warning: <path d="M12 6.5v7M12 17.25v.25" />,
		info: <path d="M12 10.75v6.75M12 6.5v.25" />,
	};
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.25}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			{type === "loading" ? <circle cx="12" cy="12" r="7.5" pathLength={1} /> : paths[type]}
		</svg>
	);
}
