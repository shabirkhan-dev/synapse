"use client";

import {
	createContext,
	type DetailsHTMLAttributes,
	type HTMLAttributes,
	type MouseEvent,
	type Ref,
	type SyntheticEvent,
	useCallback,
	useContext,
	useId,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { cn } from "../lib/utils";
import { collapsibleParts } from "./collapsible.styles";

type CollapsibleContextValue = {
	open: boolean;
	disabled: boolean;
	/** Asks for the opposite state; the owner decides (controlled) or takes it (uncontrolled). */
	toggle: () => void;
	triggerId: string;
	contentId: string;
};

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

function useCollapsibleContext(part: string) {
	const context = useContext(CollapsibleContext);
	if (!context) throw new Error(`${part} must be inside <Collapsible>`);
	return context;
}

/** The open state and a toggle, for custom parts inside a Collapsible (or an AccordionItem). */
export function useCollapsible() {
	const { open, disabled, toggle, triggerId, contentId } = useCollapsibleContext("useCollapsible");
	return { open, disabled, toggle, triggerId, contentId };
}

function setRef<T>(ref: Ref<T> | undefined, node: T | null) {
	if (typeof ref === "function") ref(node);
	else if (ref) ref.current = node;
}

export type CollapsibleProps = Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "open"> & {
	/** Open (controlled). Pair with `onOpenChange`. */
	open?: boolean;
	/** Starts open (uncontrolled). */
	defaultOpen?: boolean;
	/**
	 * The state the user asked for: a trigger press, find-in-page or a link to text inside it.
	 * In controlled mode the element stays as `open` says until you pass the new value.
	 */
	onOpenChange?: (open: boolean) => void;
	/** The trigger stops toggling and is dimmed; it leaves the Tab order. */
	disabled?: boolean;
	ref?: Ref<HTMLDetailsElement>;
};

/**
 * A `<details>`: the browser supplies the button role, the expanded state, Enter and Space, `name`
 * groups (one open at a time) and opening when find-in-page or a text fragment lands inside it,
 * and it works before hydration. React holds the state so `open` can be controlled; every request
 * (a press, or the browser opening it) goes through `onOpenChange`, and the element is put back if
 * the owner says no.
 *
 * The content grows to its own height with `interpolate-size` and `::details-content` (a grid
 * `0fr` to `1fr` fallback elsewhere) and fades in; the chevron turns over. Every animation is CSS.
 */
export function Collapsible({
	open: openProp,
	defaultOpen = false,
	onOpenChange,
	disabled = false,
	onToggle,
	className,
	children,
	ref,
	...rest
}: CollapsibleProps) {
	const [internal, setInternal] = useState(defaultOpen);
	const controlled = openProp !== undefined;
	const open = controlled ? openProp : internal;
	const details = useRef<HTMLDetailsElement>(null);
	const latest = useRef({ open, disabled, controlled, onOpenChange });
	// A re-render after every request, so a refused one is put back by the effect below.
	const [, rerender] = useReducer((count: number) => count + 1, 0);
	const id = useId();

	const request = useCallback((next: boolean) => {
		const state = latest.current;
		if (!state.disabled && next !== state.open) {
			if (!state.controlled) setInternal(next);
			state.onOpenChange?.(next);
		}
		rerender();
	}, []);

	const hydrated = useRef(false);

	// The element follows the state on every render: React leaves an unchanged `open` prop alone,
	// so the browser opening it (find-in-page, a `name` sibling) would otherwise stick. On the first
	// pass a difference is the browser's doing before hydration (a link to text or an id inside it),
	// so it is taken as a request instead of being undone.
	useLayoutEffect(() => {
		latest.current = { open, disabled, controlled, onOpenChange };
		const node = details.current;
		if (!node || node.open === open) {
			hydrated.current = true;
			return;
		}
		if (hydrated.current) node.open = open;
		else {
			hydrated.current = true;
			request(node.open);
		}
	});

	const context = useMemo<CollapsibleContextValue>(
		() => ({
			open,
			disabled,
			toggle: () => request(!latest.current.open),
			triggerId: `${id}-trigger`,
			contentId: `${id}-content`,
		}),
		[open, disabled, request, id],
	);

	return (
		<CollapsibleContext.Provider value={context}>
			<details
				data-slot="collapsible"
				{...rest}
				ref={(node) => {
					details.current = node;
					setRef(ref, node);
				}}
				open={open}
				// The browser may open it before hydration; the first effect takes that up.
				suppressHydrationWarning
				data-state={open ? "open" : "closed"}
				data-disabled={disabled ? "" : undefined}
				className={cn(collapsibleParts.root, className)}
				onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => {
					onToggle?.(event as Parameters<NonNullable<typeof onToggle>>[0]);
					// Only toggles the state did not cause: our own changes already match it.
					if (event.currentTarget.open !== latest.current.open) request(event.currentTarget.open);
				}}
			>
				{children}
			</details>
		</CollapsibleContext.Provider>
	);
}

export type CollapsibleTriggerProps = HTMLAttributes<HTMLElement> & {
	/** Draws the chevron after the label. On by default. */
	chevron?: boolean;
	ref?: Ref<HTMLElement>;
};

/**
 * The `<summary>`, which must be the Collapsible's first child. A press asks the Collapsible to
 * toggle instead of letting the element flip itself, so a controlled one stays in charge.
 */
export function CollapsibleTrigger({
	chevron = true,
	className,
	children,
	onClick,
	ref,
	...rest
}: CollapsibleTriggerProps) {
	const collapsible = useCollapsibleContext("CollapsibleTrigger");
	return (
		<summary
			id={collapsible.triggerId}
			data-slot="collapsible-trigger"
			{...rest}
			ref={ref}
			aria-disabled={collapsible.disabled || rest["aria-disabled"] || undefined}
			tabIndex={collapsible.disabled ? -1 : rest.tabIndex}
			data-state={collapsible.open ? "open" : "closed"}
			data-disabled={collapsible.disabled ? "" : undefined}
			className={cn(collapsibleParts.trigger, className)}
			onClick={(event: MouseEvent<HTMLElement>) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				// The press (or Enter / Space) would flip `open` itself; the state does it instead.
				event.preventDefault();
				collapsible.toggle();
			}}
		>
			{children}
			{chevron ? <span className={collapsibleParts.chevron} aria-hidden="true" /> : null}
		</summary>
	);
}

export type CollapsibleContentProps = HTMLAttributes<HTMLDivElement> & {
	ref?: Ref<HTMLDivElement>;
};

/** Everything that opens. The browser keeps it out of the accessibility tree while closed. */
export function CollapsibleContent({ className, ref, ...rest }: CollapsibleContentProps) {
	const collapsible = useCollapsibleContext("CollapsibleContent");
	return (
		<div
			id={collapsible.contentId}
			data-slot="collapsible-content"
			{...rest}
			ref={ref}
			data-state={collapsible.open ? "open" : "closed"}
			className={cn(collapsibleParts.content, className)}
		/>
	);
}
