"use client";

import {
	type ButtonHTMLAttributes,
	cloneElement,
	createContext,
	type DialogHTMLAttributes,
	type HTMLAttributes,
	isValidElement,
	type MouseEvent,
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
import { flushSync } from "react-dom";
import { cn } from "../lib/utils";
import {
	type DialogSide,
	type DialogSize,
	dialogClass,
	dialogParts,
	morphName,
	motionOff,
	onBackdrop,
} from "./dialog.styles";

type DialogContextValue = {
	open: boolean;
	modal: boolean;
	morph: boolean;
	contentId: string;
	titleId: string;
	descriptionId: string;
	hasTitle: boolean;
	hasDescription: boolean;
	setHasTitle: (has: boolean) => void;
	setHasDescription: (has: boolean) => void;
	contentRef: RefObject<HTMLDialogElement | null>;
	triggerRef: RefObject<HTMLElement | null>;
	/** Records a state the browser already reached (Escape, a backdrop press, an invoker). */
	sync: (open: boolean) => void;
	/** Opens or closes from our own controls, morphing from the trigger when asked. */
	change: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialog(part: string) {
	const context = use(DialogContext);
	if (!context) throw new Error(`${part} must be used inside <Dialog>`);
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

const noop = () => () => {};
/** False on the server and while hydrating, true after: React keeps both renders consistent. */
const useHydrated = () =>
	useSyncExternalStore(
		noop,
		() => true,
		() => false,
	);

export type DialogProps = {
	/** Controlled open state; pair it with `onOpenChange`. */
	open?: boolean;
	/** The state on first render, when uncontrolled. */
	defaultOpen?: boolean;
	/** Called with the next state, whatever closed or opened it. */
	onOpenChange?: (open: boolean) => void;
	/**
	 * Modal (default) puts the panel in the top layer with a backdrop and makes the page inert.
	 * `false` opens it in place with `show()`: no backdrop, the page stays usable.
	 */
	modal?: boolean;
	/**
	 * Grow the panel out of its trigger and fold it back on close, with a View Transition. Falls
	 * back to the scale and fade where View Transitions, or motion, are not available.
	 */
	morph?: boolean;
	children?: ReactNode;
};

/**
 * Holds a dialog's state and wires its parts together. Every part reads it, so the trigger, the
 * title and the description need no ids passed by hand.
 */
export function Dialog({
	open: openProp,
	defaultOpen = false,
	onOpenChange,
	modal = true,
	morph = false,
	children,
}: DialogProps) {
	const id = useId();
	const [internal, setInternal] = useState(defaultOpen);
	const [hasTitle, setHasTitle] = useState(false);
	const [hasDescription, setHasDescription] = useState(false);
	const controlled = openProp !== undefined;
	const open = controlled ? openProp : internal;
	const contentRef = useRef<HTMLDialogElement>(null);
	const triggerRef = useRef<HTMLElement>(null);

	// The last committed state, for event handlers that run between renders.
	const current = useRef(open);
	useLayoutEffect(() => {
		current.current = open;
	}, [open]);

	const sync = useCallback(
		(next: boolean) => {
			if (next === current.current) return;
			if (!controlled) setInternal(next);
			onOpenChange?.(next);
		},
		[controlled, onOpenChange],
	);

	const change = useCallback(
		(next: boolean) => {
			const dialog = contentRef.current;
			const trigger = triggerRef.current;
			if (
				!morph ||
				!dialog ||
				!trigger ||
				!modal ||
				next === current.current ||
				typeof document.startViewTransition !== "function" ||
				motionOff(dialog)
			) {
				sync(next);
				return;
			}
			// The element that is visible now carries the name into the old picture, the other one
			// into the new picture, and the browser animates the box between them.
			const name = morphName(id);
			const [from, to] = next ? [trigger, dialog] : [dialog, trigger];
			from.style.viewTransitionName = name;
			dialog.dataset.morphing = "";
			const update = () => {
				from.style.viewTransitionName = "";
				to.style.viewTransitionName = name;
				flushSync(() => sync(next));
			};
			// A type tells the CSS which way it is going; older engines take only the callback.
			const transition =
				typeof ViewTransition !== "undefined" && "types" in ViewTransition.prototype
					? document.startViewTransition({
							update,
							types: [next ? "rx-morph-open" : "rx-morph-close"],
						})
					: document.startViewTransition(update);
			void transition.finished.finally(() => {
				to.style.viewTransitionName = "";
				delete dialog.dataset.morphing;
			});
		},
		[id, modal, morph, sync],
	);

	const value = useMemo<DialogContextValue>(
		() => ({
			open,
			modal,
			morph,
			contentId: `${id}-content`,
			titleId: `${id}-title`,
			descriptionId: `${id}-description`,
			hasTitle,
			hasDescription,
			setHasTitle,
			setHasDescription,
			contentRef,
			triggerRef,
			sync,
			change,
		}),
		[open, modal, morph, id, hasTitle, hasDescription, sync, change],
	);

	return <DialogContext value={value}>{children}</DialogContext>;
}

type ButtonPartProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	/**
	 * Merge into the one child element instead of rendering a button, such as our `Button` or a
	 * link styled as one. The child must forward its props and ref to a focusable element.
	 */
	asChild?: boolean;
	ref?: Ref<HTMLButtonElement>;
};

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

/** Renders a button, or hands the same props to its child with `asChild`. */
function ButtonPart({
	asChild,
	children,
	onClick,
	onActivate,
	ref,
	...rest
}: ButtonPartProps & { onActivate: () => void }) {
	const handle = (event: MouseEvent<HTMLButtonElement>) => {
		onClick?.(event);
		if (!event.defaultPrevented) onActivate();
	};
	const only = useResolvedChild(children);
	if (asChild && isValidElement(only)) {
		const child = only as ReactElement<Record<string, unknown> & { ref?: Ref<HTMLButtonElement> }>;
		const childClick = child.props.onClick as
			| ((event: MouseEvent<HTMLButtonElement>) => void)
			| undefined;
		return cloneElement(child, {
			...rest,
			// oxlint-disable-next-line react/refs -- the child's own ref prop, merged, not a ref's value
			ref: mergeRefs(ref, child.props.ref),
			onClick: (event: MouseEvent<HTMLButtonElement>) => {
				childClick?.(event);
				if (!event.defaultPrevented) handle(event);
			},
		});
	}
	return (
		<button type="button" {...rest} ref={ref} onClick={handle}>
			{children}
		</button>
	);
}

export type DialogTriggerProps = ButtonPartProps;

/**
 * Opens the dialog. It is announced as opening a dialog, and focus comes back to it on close.
 * Until the page hydrates it also carries `command="show-modal"`, so where the Invoker Commands API
 * exists the dialog already opens without JavaScript.
 */
export function DialogTrigger({ ref, ...rest }: DialogTriggerProps) {
	const dialog = useDialog("DialogTrigger");
	const hydrated = useHydrated();
	// Not in React's types yet; React passes lowercase attributes through.
	const invoker =
		!hydrated && dialog.modal && !dialog.morph
			? ({ command: "show-modal", commandfor: dialog.contentId } as Record<string, string>)
			: undefined;
	return (
		<ButtonPart
			{...invoker}
			{...rest}
			ref={mergeRefs(ref, dialog.triggerRef as RefObject<HTMLButtonElement | null>)}
			aria-haspopup="dialog"
			aria-expanded={dialog.open}
			aria-controls={dialog.contentId}
			data-slot="dialog-trigger"
			data-morph={dialog.morph ? "" : undefined}
			onActivate={() => dialog.change(true)}
		/>
	);
}

export type DialogCloseProps = ButtonPartProps;

/** Closes the dialog: wrap a Cancel or Done button in it with `asChild`, or use it as a button. */
export function DialogClose({ ref, ...rest }: DialogCloseProps) {
	const dialog = useDialog("DialogClose");
	return (
		<ButtonPart
			{...rest}
			ref={ref}
			data-slot="dialog-close"
			onActivate={() => dialog.change(false)}
		/>
	);
}

export type DialogContentProps = Omit<DialogHTMLAttributes<HTMLDialogElement>, "open"> & {
	/** Width: 24, 32 (default) or 42rem. A sheet takes three quarters (right) or 1.25× (bottom). */
	size?: DialogSize;
	/** `center` (default), or a sheet that slides in from the `right` or the `bottom` edge. */
	side?: DialogSide;
	/** The round close button in the top corner. Default true. */
	showClose?: boolean;
	/** The close button's accessible name. Default "Close". */
	closeLabel?: string;
	/**
	 * Close on a press on the backdrop (light dismiss). Default true. Escape always closes; to
	 * keep a dialog open, control `open` and ignore the change.
	 */
	dismissible?: boolean;
	ref?: Ref<HTMLDialogElement>;
};

const closedBySupported = () =>
	typeof HTMLDialogElement !== "undefined" && "closedBy" in HTMLDialogElement.prototype;

/**
 * The panel: a native `<dialog>`. It is named by `DialogTitle` and described by
 * `DialogDescription` automatically, and stays in the page while closed (hidden), so it can open
 * before hydration and its state survives a close.
 */
export function DialogContent({
	size = "md",
	side = "center",
	showClose = true,
	closeLabel = "Close",
	dismissible = true,
	className,
	children,
	onClick,
	onPointerDown,
	ref,
	...rest
}: DialogContentProps) {
	const dialog = useDialog("DialogContent");
	const { open, modal, contentRef, sync, change } = dialog;
	const pressedBackdrop = useRef(false);

	// State drives the element. Opening twice or closing a closed dialog is a no-op. On the first
	// run, a dialog an invoker opened before hydration is adopted rather than closed.
	const adopted = useRef(false);
	useLayoutEffect(() => {
		const element = contentRef.current;
		if (!element) return;
		if (!adopted.current) {
			adopted.current = true;
			if (element.open && !open) {
				sync(true);
				return;
			}
		}
		if (open && !element.open) {
			if (modal) element.showModal();
			else element.show();
		} else if (!open && element.open) {
			element.close();
		}
	}, [open, modal, contentRef, sync]);

	// The browser can change the state too: Escape and light dismiss ask first (`cancel`), an
	// invoker opens it (`toggle`), and anything else that closes it ends in `close`.
	useEffect(() => {
		const element = contentRef.current;
		if (!element) return;
		const onCancel = (event: Event) => {
			if (event.target !== element || !event.cancelable) return;
			event.preventDefault();
			change(false);
		};
		const onClose = (event: Event) => {
			if (event.target === element) sync(false);
		};
		const onToggle = (event: Event) => {
			if (event.target === element && (event as ToggleEvent).newState === "open") sync(true);
		};
		element.addEventListener("cancel", onCancel);
		element.addEventListener("close", onClose);
		element.addEventListener("toggle", onToggle);
		return () => {
			element.removeEventListener("cancel", onCancel);
			element.removeEventListener("close", onClose);
			element.removeEventListener("toggle", onToggle);
		};
	}, [contentRef, change, sync]);

	return (
		// The dialog's keyboard equivalent of a backdrop press is Escape, which the browser handles.
		// oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
		<dialog
			{...rest}
			ref={mergeRefs(ref, contentRef)}
			id={dialog.contentId}
			closedby={dismissible ? "any" : "closerequest"}
			aria-labelledby={dialog.hasTitle ? dialog.titleId : undefined}
			aria-describedby={dialog.hasDescription ? dialog.descriptionId : undefined}
			data-slot="dialog-content"
			data-size={size}
			data-side={side}
			className={cn(dialogClass({ size, side }), className)}
			onPointerDown={(event) => {
				onPointerDown?.(event);
				pressedBackdrop.current =
					event.target === event.currentTarget &&
					onBackdrop(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);
			}}
			onClick={(event) => {
				onClick?.(event);
				// Light dismiss where `closedby` is not supported. The press and the release must both
				// land on the backdrop, so a drag out of a text field does not close the dialog.
				if (
					!dismissible ||
					closedBySupported() ||
					event.defaultPrevented ||
					event.target !== event.currentTarget ||
					!pressedBackdrop.current
				)
					return;
				if (onBackdrop(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY))
					change(false);
			}}
		>
			{children}
			{showClose ? <DialogClose className={dialogParts.close} aria-label={closeLabel} /> : null}
		</dialog>
	);
}

type PartProps<T> = HTMLAttributes<T> & { ref?: Ref<T> };

/** Title and description, stacked. */
export function DialogHeader({ className, ...rest }: PartProps<HTMLDivElement>) {
	return <div {...rest} data-slot="dialog-header" className={cn(dialogParts.header, className)} />;
}

/** The actions, at the end. Below 20rem of panel width they stack, the primary one on top. */
export function DialogFooter({ className, ...rest }: PartProps<HTMLDivElement>) {
	return <div {...rest} data-slot="dialog-footer" className={cn(dialogParts.footer, className)} />;
}

/** The dialog's name: an `h2` the panel points `aria-labelledby` at. */
export function DialogTitle({ className, children, ...rest }: PartProps<HTMLHeadingElement>) {
	const dialog = useDialog("DialogTitle");
	const { setHasTitle } = dialog;
	useLayoutEffect(() => {
		setHasTitle(true);
		return () => setHasTitle(false);
	}, [setHasTitle]);
	return (
		<h2
			{...rest}
			id={dialog.titleId}
			data-slot="dialog-title"
			className={cn(dialogParts.title, className)}
		>
			{children}
		</h2>
	);
}

/** A line under the title, which the panel points `aria-describedby` at. */
export function DialogDescription({ className, ...rest }: PartProps<HTMLParagraphElement>) {
	const dialog = useDialog("DialogDescription");
	const { setHasDescription } = dialog;
	useLayoutEffect(() => {
		setHasDescription(true);
		return () => setHasDescription(false);
	}, [setHasDescription]);
	return (
		<p
			{...rest}
			id={dialog.descriptionId}
			data-slot="dialog-description"
			className={cn(dialogParts.description, className)}
		/>
	);
}
