"use client";

import {
	type CSSProperties,
	type ReactNode,
	type Ref,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Button, type ButtonProps } from "./button";
import { type ButtonState, buttonParts } from "./button.styles";
import { exitMs, splitLetters } from "./stateful-label";

export type StatefulButtonProps = ButtonProps & {
	/** `loading` blocks clicks and marks the button busy; the others only change the label. */
	state?: ButtonState;
	/** The idle label. */
	children: ReactNode;
	loadingText?: ReactNode;
	successText?: ReactNode;
	errorText?: ReactNode;
	/** An icon after the idle label. It folds away while any other state shows. */
	icon?: ReactNode;
};

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * A button for an action that takes a moment. Changing `state` folds the old status icon away,
 * widens the new one in, and rolls the label over letter by letter while the button eases to the
 * new width. All of that is CSS; this component only says which label is arriving and which is
 * leaving, and measures the arriving one.
 */
export function StatefulButton({
	state = "idle",
	children,
	loadingText = "Loading",
	successText = "Done",
	errorText = "Try again",
	icon,
	onClick,
	...rest
}: StatefulButtonProps) {
	const busy = state === "loading";
	const text = { idle: children, loading: loadingText, success: successText, error: errorText }[
		state
	];

	return (
		<Button
			{...rest}
			aria-busy={busy || undefined}
			aria-live="polite"
			data-state={state}
			onClick={(event) => (busy ? event.preventDefault() : onClick?.(event))}
		>
			<Slot shown={state === "loading"}>
				<span className={buttonParts.glyph} data-glyph="spinner" />
			</Slot>
			<Slot shown={state === "success"}>
				<span className={buttonParts.glyph} data-glyph="check" />
			</Slot>
			<Slot shown={state === "error"}>
				<span className={buttonParts.glyph} data-glyph="cross" />
			</Slot>
			<LabelSwap id={state}>{text}</LabelSwap>
			{icon ? <Slot shown={state === "idle"}>{icon}</Slot> : null}
		</Button>
	);
}

function Slot({ shown, children }: { shown: boolean; children: ReactNode }) {
	return (
		<span className={buttonParts.slot} data-shown={shown ? "" : undefined} aria-hidden="true">
			{children}
		</span>
	);
}

type Shown = { id: string; node: ReactNode; enter: boolean };

/**
 * One label at a time, plus the one leaving. A new `id` (or new text) keeps the old label for the
 * length of its exit, marks the new one to roll in, and sets the box width to the new label's.
 * The first render does not animate.
 */
function LabelSwap({ id, children }: { id: string; children: ReactNode }) {
	const key =
		typeof children === "string" || typeof children === "number" ? `${id}:${children}` : id;
	const [shown, setShown] = useState<Shown>({ id: key, node: children, enter: false });
	const [leaving, setLeaving] = useState<Shown[]>([]);
	const [width, setWidth] = useState<number>();
	// The keyed `<Label>` below remounts per label, so its roll-in keyframes start over each swap.
	const current = useRef<HTMLSpanElement>(null);

	if (shown.id !== key) {
		setLeaving((list) => [...list.filter((item) => item.id !== key), { ...shown, enter: false }]);
		setShown({ id: key, node: children, enter: true });
	}

	// Measure the letters as laid out, not the plain string: kerning can make the string narrower
	// than its inline-block letters, which would clip the last one.
	useIsomorphicLayoutEffect(() => {
		const next = current.current?.offsetWidth;
		if (next) setWidth((before) => (before === next ? before : next));
	});

	useEffect(() => {
		if (leaving.length === 0) return;
		const longest = Math.max(...leaving.map((item) => letterCount(item.node)));
		const timer = setTimeout(() => setLeaving([]), exitMs(longest) + 40);
		return () => clearTimeout(timer);
	}, [leaving]);

	return (
		<span
			className={buttonParts.text}
			style={width ? ({ "--_btn-text-w": `${width}px` } as CSSProperties) : undefined}
		>
			{typeof children === "string" ? <span className={buttonParts.srOnly}>{children}</span> : null}
			<Label key={shown.id} ref={current} node={children} enter={shown.enter} />
			{leaving.map((item) => (
				<Label key={`out:${item.id}`} node={item.node} exit />
			))}
		</span>
	);
}

function letterCount(node: ReactNode): number {
	return typeof node === "string" ? splitLetters(node).length : 1;
}

function Label({
	node,
	enter,
	exit,
	ref,
}: {
	node: ReactNode;
	enter?: boolean;
	exit?: boolean;
	ref?: Ref<HTMLSpanElement>;
}) {
	const text = typeof node === "string";
	return (
		<span
			ref={ref}
			className={buttonParts.label}
			data-enter={enter ? "" : undefined}
			data-exit={exit ? "" : undefined}
			aria-hidden={text || exit ? "true" : undefined}
		>
			{text ? (
				splitLetters(node).map((letter, index) => (
					<span
						// Position is the letter's identity within one label.
						// oxlint-disable-next-line react/no-array-index-key
						key={index}
						className={buttonParts.letter}
						style={{ "--_i": index } as CSSProperties}
					>
						{letter}
					</span>
				))
			) : (
				<span className={buttonParts.letter}>{node}</span>
			)}
		</span>
	);
}
