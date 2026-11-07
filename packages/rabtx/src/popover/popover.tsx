"use client";

import {
	type ButtonHTMLAttributes,
	createContext,
	type CSSProperties,
	type HTMLAttributes,
	type ReactNode,
	type Ref,
	use,
	useId,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import {
	anchorName,
	firstFocusable,
	mergeRefs,
	type PopoverAlign,
	type PopoverSide,
	type PopoverStateOptions,
	type PopoverState,
	Slot,
	usePopoverState,
} from "../hooks/use-popover";
import { cn } from "../lib/utils";
import { placement, popoverParts } from "./popover.styles";

type PopoverContextValue = PopoverState & {
	contentId: string;
	triggerId: string;
	titleId: string;
	descriptionId: string;
	anchor: string;
	hasTitle: boolean;
	hasDescription: boolean;
	setHasTitle: (has: boolean) => void;
	setHasDescription: (has: boolean) => void;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopover(part: string) {
	const context = use(PopoverContext);
	if (!context) throw new Error(`${part} must be used inside <Popover>`);
	return context;
}

export type PopoverProps = PopoverStateOptions & { children?: ReactNode };

/**
 * Holds a popover's state and wires its parts together: a non-modal panel anchored to its trigger,
 * on the native Popover API. A press outside, Escape or the trigger closes it, and focus goes back.
 */
export function Popover({ children, ...options }: PopoverProps) {
	const id = useId();
	const state = usePopoverState(options);
	const [hasTitle, setHasTitle] = useState(false);
	const [hasDescription, setHasDescription] = useState(false);
	const value = useMemo<PopoverContextValue>(
		() => ({
			...state,
			contentId: `${id}-content`,
			triggerId: `${id}-trigger`,
			titleId: `${id}-title`,
			descriptionId: `${id}-description`,
			anchor: anchorName(id),
			hasTitle,
			hasDescription,
			setHasTitle,
			setHasDescription,
		}),
		[state, id, hasTitle, hasDescription],
	);
	return <PopoverContext value={value}>{children}</PopoverContext>;
}

type ButtonPartProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	/**
	 * Merge into the one child element instead of rendering a button, such as our `Button`. The
	 * child must forward its props and ref to a `<button>`.
	 */
	asChild?: boolean;
	ref?: Ref<HTMLButtonElement>;
};

export type PopoverTriggerProps = ButtonPartProps;

/**
 * Opens and closes the popover. It is a native invoker (`popovertarget`), so it works before the
 * page hydrates, and it is the anchor the panel is placed against.
 */
export function PopoverTrigger({ ref, style, ...rest }: PopoverTriggerProps) {
	const popover = usePopover("PopoverTrigger");
	return (
		<Slot
			id={popover.triggerId}
			{...rest}
			ref={mergeRefs(ref as Ref<HTMLElement>, (node: HTMLElement | null) => {
				popover.triggerRef.current = node;
			})}
			style={{ ...style, anchorName: popover.anchor }}
			popoverTarget={popover.contentId}
			aria-haspopup="dialog"
			aria-expanded={popover.open}
			aria-controls={popover.contentId}
			data-state={popover.open ? "open" : "closed"}
			data-slot="popover-trigger"
		/>
	);
}

export type PopoverCloseProps = ButtonPartProps;

/** Closes the popover: a native `popovertargetaction="hide"`, so it works before hydration too. */
export function PopoverClose(props: PopoverCloseProps) {
	const popover = usePopover("PopoverClose");
	return (
		<Slot
			{...props}
			popoverTarget={popover.contentId}
			popoverTargetAction="hide"
			data-slot="popover-close"
		/>
	);
}

export type PopoverContentProps = Omit<HTMLAttributes<HTMLDivElement>, "popover"> & {
	/** The side of the trigger it opens on. Flips to the other side when it would not fit. */
	side?: PopoverSide;
	/** Line up with the trigger's start edge, its center (default) or its end edge. */
	align?: PopoverAlign;
	/** The gap to the trigger, in px. Default 8. */
	sideOffset?: number;
	/** Classes for the panel (width, padding). Props other than these go on the `[popover]`. */
	className?: string;
	ref?: Ref<HTMLDivElement>;
};

/**
 * The panel: a `[popover]` in the top layer, anchored to the trigger with CSS anchor positioning.
 * It stays in the page while closed (hidden), so the trigger can open it before hydration. On
 * open, focus moves to its first focusable element, or to the panel.
 */
export function PopoverContent({
	side = "bottom",
	align = "center",
	sideOffset,
	className,
	style,
	children,
	ref,
	...rest
}: PopoverContentProps) {
	const popover = usePopover("PopoverContent");
	const { onShown } = popover;
	useLayoutEffect(() => {
		onShown.current = (element) => {
			(firstFocusable(element) ?? element).focus({ preventScroll: true });
		};
	}, [onShown]);
	return (
		<div
			role="dialog"
			// Named by its title, or by the trigger when it has none.
			aria-labelledby={
				popover.hasTitle ? popover.titleId : rest["aria-label"] ? undefined : popover.triggerId
			}
			aria-describedby={popover.hasDescription ? popover.descriptionId : undefined}
			tabIndex={-1}
			{...rest}
			{...placement({ side, align })}
			id={popover.contentId}
			ref={mergeRefs(ref, (node: HTMLDivElement | null) => {
				popover.contentRef.current = node;
			})}
			popover="auto"
			className={popoverParts.root}
			style={
				{
					...style,
					positionAnchor: popover.anchor,
					...(sideOffset === undefined ? null : { "--_offset": `${sideOffset}px` }),
				} as CSSProperties
			}
			data-state={popover.open ? "open" : "closed"}
			data-slot="popover-content"
			onToggle={popover.onToggle}
			onBeforeToggle={popover.onBeforeToggle}
		>
			<div className={cn(popoverParts.surface, popoverParts.content, className)}>{children}</div>
		</div>
	);
}

/** Lines up a title and a description at the top of the panel. */
export function PopoverHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div {...rest} className={cn(popoverParts.header, className)} data-slot="popover-header" />
	);
}

/** The panel's name: `aria-labelledby` points at it. A `div`, so it adds no heading to the page. */
export function PopoverTitle({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
	const popover = usePopover("PopoverTitle");
	const { setHasTitle } = popover;
	useLayoutEffect(() => {
		setHasTitle(true);
		return () => setHasTitle(false);
	}, [setHasTitle]);
	return (
		<div
			id={popover.titleId}
			{...rest}
			className={cn(popoverParts.title, className)}
			data-slot="popover-title"
		/>
	);
}

/** A line under the title: `aria-describedby` points at it. */
export function PopoverDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
	const popover = usePopover("PopoverDescription");
	const { setHasDescription } = popover;
	useLayoutEffect(() => {
		setHasDescription(true);
		return () => setHasDescription(false);
	}, [setHasDescription]);
	return (
		<p
			id={popover.descriptionId}
			{...rest}
			className={cn(popoverParts.description, className)}
			data-slot="popover-description"
		/>
	);
}
