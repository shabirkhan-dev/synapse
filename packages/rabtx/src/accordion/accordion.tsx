"use client";

import {
	createContext,
	type HTMLAttributes,
	type KeyboardEvent,
	type ReactNode,
	type Ref,
	useCallback,
	useContext,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Collapsible,
	CollapsibleContent,
	type CollapsibleContentProps,
	type CollapsibleProps,
	CollapsibleTrigger,
	type CollapsibleTriggerProps,
	useCollapsible,
} from "../collapsible/collapsible";
import { cn } from "../lib/utils";
import { type AccordionVariant, accordionClass, accordionParts } from "./accordion.styles";

type AccordionContextValue = {
	type: "single" | "multiple";
	open: readonly string[];
	collapsible: boolean;
	/** The `name` that groups a single accordion's items, so the browser keeps one open. */
	name: string | undefined;
	request: (value: string, open: boolean, item: HTMLDetailsElement | null) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordion(part: string) {
	const context = useContext(AccordionContext);
	if (!context) throw new Error(`${part} must be inside <Accordion>`);
	return context;
}

type AccordionItemContextValue = { value: string; locked: boolean };
const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

type AccordionBaseProps = Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> & {
	/**
	 * `separated` (default): one joined stack where the open item lifts out as its own card.
	 * `cards`: every item is its own card. `flush`: rows divided by lines, no surface.
	 */
	variant?: AccordionVariant;
	ref?: Ref<HTMLDivElement>;
};

export type AccordionSingleProps = AccordionBaseProps & {
	/** One item open at a time (default). */
	type?: "single";
	/** The open item (controlled); `""` for none. */
	value?: string;
	/** The item open first (uncontrolled). */
	defaultValue?: string;
	/** The newly open item, or `""` when the open one closes. */
	onValueChange?: (value: string) => void;
	/** Whether the open item can be closed again, leaving none open. Off by default. */
	collapsible?: boolean;
};

export type AccordionMultipleProps = AccordionBaseProps & {
	/** Any number of items open. */
	type: "multiple";
	/** The open items (controlled). */
	value?: string[];
	/** The items open first (uncontrolled). */
	defaultValue?: string[];
	/** Every open item, after each change. */
	onValueChange?: (value: string[]) => void;
	collapsible?: never;
};

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

const asList = (value: string | string[] | undefined): string[] =>
	value === undefined || value === "" ? [] : typeof value === "string" ? [value] : value;

/** The items and triggers of this accordion, not of one nested inside it. */
function own<T extends Element>(root: Element, selector: string): T[] {
	return Array.from(root.querySelectorAll<T>(selector)).filter(
		(node) => node.closest(`.${accordionParts.root}`) === root,
	);
}

/**
 * A stack of Collapsibles (`<details>`) with one shared state. `single` gives the items one `name`,
 * so the browser itself keeps one open (and does so before hydration); `multiple` leaves them free.
 * Up and down arrows, Home and End move between triggers. Heights, corners, gaps, the chevron and the
 * content's fade are CSS transitions; JavaScript only holds which items are open.
 */
export function Accordion(props: AccordionProps) {
	const {
		type = "single",
		value: valueProp,
		defaultValue,
		onValueChange,
		collapsible = false,
		variant = "separated",
		className,
		children,
		onKeyDown,
		ref,
		...rest
	} = props;
	const [internal, setInternal] = useState(() => asList(defaultValue));
	const controlled = valueProp !== undefined;
	const open = useMemo(
		() => (controlled ? asList(valueProp) : internal),
		[controlled, valueProp, internal],
	);
	const root = useRef<HTMLDivElement>(null);
	const name = useId();

	const commit = useCallback(
		(next: string[]) => {
			if (!controlled) setInternal(next);
			if (type === "multiple") (onValueChange as ((v: string[]) => void) | undefined)?.(next);
			else (onValueChange as ((v: string) => void) | undefined)?.(next[0] ?? "");
		},
		[controlled, onValueChange, type],
	);

	const request = useCallback(
		(value: string, opening: boolean, item: HTMLDetailsElement | null) => {
			if (type === "multiple") {
				commit(opening ? [...open, value] : open.filter((v) => v !== value));
				return;
			}
			if (opening) {
				commit([value]);
				return;
			}
			// A single accordion's open item closes either because the browser opened a sibling in its
			// `name` group (find-in-page, a text fragment), whose own toggle may not have arrived yet,
			// or because it was asked to. The sibling wins; otherwise only `collapsible` may close.
			const node = root.current;
			const sibling =
				node &&
				own<HTMLDetailsElement>(node, `.${accordionParts.item}`).find(
					(details) => details !== item && details.open && details.dataset.value !== undefined,
				);
			if (sibling?.dataset.value !== undefined && sibling.dataset.value !== value) {
				commit([sibling.dataset.value]);
			} else if (collapsible) commit([]);
		},
		[collapsible, commit, open, type],
	);

	const context = useMemo<AccordionContextValue>(
		() => ({ type, open, collapsible, name: type === "single" ? name : undefined, request }),
		[type, open, collapsible, name, request],
	);

	const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
		onKeyDown?.(event);
		const node = root.current;
		if (event.defaultPrevented || !node) return;
		const triggers = own<HTMLElement>(node, `.${accordionParts.trigger}`).filter(
			(trigger) => !trigger.hasAttribute("data-disabled"),
		);
		const at = triggers.indexOf(event.target as HTMLElement);
		if (at < 0) return;
		const next =
			event.key === "ArrowDown"
				? triggers[(at + 1) % triggers.length]
				: event.key === "ArrowUp"
					? triggers[(at - 1 + triggers.length) % triggers.length]
					: event.key === "Home"
						? triggers[0]
						: event.key === "End"
							? triggers[triggers.length - 1]
							: undefined;
		if (!next) return;
		event.preventDefault();
		next.focus();
	};

	return (
		<AccordionContext.Provider value={context}>
			{/* Keys only move focus between the triggers inside; the triggers are the controls. */}
			{/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
			<div
				{...rest}
				ref={(node) => {
					root.current = node;
					if (typeof ref === "function") ref(node);
					else if (ref) ref.current = node;
				}}
				data-slot="accordion"
				data-orientation="vertical"
				className={cn(accordionClass(variant), className)}
				onKeyDown={moveFocus}
			>
				{children}
			</div>
		</AccordionContext.Provider>
	);
}

export type AccordionItemProps = Omit<
	CollapsibleProps,
	"open" | "defaultOpen" | "onOpenChange" | "name"
> & {
	/** Identifies the item in `value`. Required. */
	value: string;
};

/** One `<details>`. Its first child is the AccordionTrigger, then the AccordionContent. */
export function AccordionItem({ value, disabled, className, ref, ...rest }: AccordionItemProps) {
	const accordion = useAccordion("AccordionItem");
	const open = accordion.open.includes(value);
	const details = useRef<HTMLDetailsElement>(null);
	// A single accordion that is not collapsible keeps its open item open (WAI-ARIA, as Radix).
	const locked = open && accordion.type === "single" && !accordion.collapsible;
	const item = useMemo(() => ({ value, locked }), [value, locked]);

	return (
		<AccordionItemContext.Provider value={item}>
			<Collapsible
				{...rest}
				ref={(node) => {
					details.current = node;
					if (typeof ref === "function") ref(node);
					else if (ref) ref.current = node;
				}}
				name={accordion.name}
				open={open}
				disabled={disabled}
				onOpenChange={(next) => accordion.request(value, next, details.current)}
				data-slot="accordion-item"
				data-value={value}
				className={cn(accordionParts.item, className)}
			/>
		</AccordionItemContext.Provider>
	);
}

export type AccordionTriggerProps = Omit<CollapsibleTriggerProps, "chevron"> & {
	/** A decorative icon before the title, such as a HugeIcons element. */
	icon?: ReactNode;
};

/** The `<summary>`: the icon, the title and a chevron that turns over as the item opens. */
export function AccordionTrigger({ icon, className, children, ...rest }: AccordionTriggerProps) {
	const item = useContext(AccordionItemContext);
	if (!item) throw new Error("AccordionTrigger must be inside <AccordionItem>");
	return (
		<CollapsibleTrigger
			aria-disabled={item.locked || undefined}
			{...rest}
			data-slot="accordion-trigger"
			className={cn(accordionParts.trigger, className)}
		>
			{icon ? (
				<span className={accordionParts.icon} aria-hidden="true">
					{icon}
				</span>
			) : null}
			<span className={accordionParts.title}>{children}</span>
		</CollapsibleTrigger>
	);
}

export type AccordionContentProps = CollapsibleContentProps;

/** The panel: a `region` named by its trigger. Its padding is inside the part that animates. */
export function AccordionContent({ className, ...rest }: AccordionContentProps) {
	const { triggerId } = useCollapsible();
	return (
		<CollapsibleContent
			role="region"
			aria-labelledby={triggerId}
			{...rest}
			data-slot="accordion-content"
			className={cn(accordionParts.content, className)}
		/>
	);
}
