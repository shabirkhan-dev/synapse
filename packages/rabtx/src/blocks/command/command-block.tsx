"use client";

import {
	type ReactElement,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { Button } from "../../button/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../../dialog/dialog";
import { type CommandPanelProps, CommandPanel } from "./command-panel";
import { commandParts } from "./command.styles";
import { SearchIcon } from "./icons";

export type CommandBlockProps = Omit<
	CommandPanelProps,
	"onClose" | "surface" | "focusOnMount" | "escapeHint" | "ref"
> & {
	/** Controlled open state; pair it with `onOpenChange`. */
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	/**
	 * The key that opens and closes the palette with ⌘ (Mac) or Ctrl (elsewhere). Default "k".
	 * `false` binds nothing, such as for a second palette on the page.
	 */
	shortcut?: string | false;
	/**
	 * The button that opens it. Default: a search button showing the shortcut. Pass your own element
	 * (it gets the dialog trigger's props) or `false` for none.
	 */
	trigger?: ReactElement | false;
	/** The default trigger's text. Default "Search…". */
	triggerLabel?: string;
	/** The dialog's accessible name. Default "Command palette". */
	title?: string;
};

const NONE: string[] = [];
const noop = () => () => {};
/** Apple keyboards say ⌘; the server and everything else say Ctrl until the page hydrates. */
const useApple = () =>
	useSyncExternalStore(
		noop,
		() => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent),
		() => false,
	);

/** Whether a key press is ⌘ or Ctrl plus `key` and nothing else. */
export function isShortcut(
	event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
	key: string,
) {
	return (
		(event.metaKey || event.ctrlKey) &&
		!event.altKey &&
		!event.shiftKey &&
		event.key.toLowerCase() === key.toLowerCase()
	);
}

/**
 * A command palette: a trigger button, ⌘K / Ctrl+K anywhere on the page, and a `CommandPanel` in a
 * native modal `<dialog>`, so the top layer, the inert page, Escape, light dismiss and focus return
 * are the browser's. Each opening starts fresh on the first page with an empty search; recent
 * commands are kept across openings.
 */
export function CommandBlock({
	open: openProp,
	defaultOpen = false,
	onOpenChange,
	shortcut = "k",
	trigger,
	triggerLabel = "Search…",
	title = "Command palette",
	recent: recentProp,
	defaultRecent = NONE,
	onRecentChange,
	...panel
}: CommandBlockProps) {
	const [inner, setInner] = useState(defaultOpen);
	const controlled = openProp !== undefined;
	const open = controlled ? openProp : inner;
	const apple = useApple();

	// A new session (a fresh panel) on every opening, however it was opened.
	const [session, setSession] = useState(0);
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) setSession((n) => n + 1);
	}

	const [innerRecent, setInnerRecent] = useState(defaultRecent);
	const recent = recentProp ?? innerRecent;

	const current = useRef(open);
	useLayoutEffect(() => {
		current.current = open;
	}, [open]);

	const setOpen = useCallback(
		(next: boolean) => {
			if (next === current.current) return;
			if (!controlled) setInner(next);
			onOpenChange?.(next);
		},
		[controlled, onOpenChange],
	);

	useEffect(() => {
		if (!shortcut) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.repeat || !isShortcut(event, shortcut)) return;
			event.preventDefault();
			setOpen(!current.current);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [shortcut, setOpen]);

	const keys = shortcut ? [apple ? "⌘" : "Ctrl", shortcut.toUpperCase()] : [];

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger === false ? null : (
				<DialogTrigger
					asChild
					aria-keyshortcuts={
						shortcut
							? `Meta+${shortcut.toUpperCase()} Control+${shortcut.toUpperCase()}`
							: undefined
					}
				>
					{trigger ?? (
						<Button variant="outline" className={commandParts.trigger}>
							<SearchIcon />
							<span className="flex-1 text-start">{triggerLabel}</span>
							{keys.length ? (
								<span aria-hidden="true" className="flex items-center gap-1">
									{keys.map((key) => (
										<kbd key={key} className={commandParts.kbd}>
											{key}
										</kbd>
									))}
								</span>
							) : null}
						</Button>
					)}
				</DialogTrigger>
			)}
			<DialogContent showClose={false} className={commandParts.dialog}>
				<DialogTitle className="sr-only">{title}</DialogTitle>
				<CommandPanel
					key={session}
					{...panel}
					recent={recent}
					onRecentChange={(next) => {
						if (recentProp === undefined) setInnerRecent(next);
						onRecentChange?.(next);
					}}
					surface={false}
					escapeHint
					focusOnMount
					onClose={() => setOpen(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}
