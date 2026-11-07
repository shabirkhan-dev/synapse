"use client";

import {
	type CSSProperties,
	type KeyboardEvent,
	type ReactNode,
	type Ref,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Badge } from "../../badge/badge";
import { Button } from "../../button/button";
import { Input } from "../../input/input";
import { cn } from "../../lib/utils";
import { Tabs, TabsList, TabsTrigger } from "../../tabs/tabs";
import {
	type CommandItem,
	type CommandRow,
	commandGroups,
	commandSections,
	labels,
	pushRecent,
} from "./command-search";
import { SKELETON_ROWS, commandParts } from "./command.styles";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ClockIcon,
	EnterIcon,
	SearchIcon,
} from "./icons";

export type CommandPanelProps = {
	/** The commands on the first page. Give one `items` to make it open a page of its own. */
	commands: CommandItem[];
	/** Runs after a command's own `onSelect`, with the page items above it. */
	onSelect?: (item: CommandItem, parents: CommandItem[]) => void;
	/** Called after a command runs, unless it has `keepOpen`. The block closes its dialog here. */
	onClose?: () => void;
	/** The accessible name of the search field and the list. Default "Commands". */
	label?: string;
	placeholder?: string;
	/** The search text (controlled). It is cleared on every page change. */
	query?: string;
	defaultQuery?: string;
	/** The new search text, and the page it is on, such as to fetch results for it. */
	onQueryChange?: (query: string, page: CommandItem | undefined) => void;
	/** `false` lists `commands` as given, for results your own search filtered. Default true. */
	filter?: boolean;
	/** Results are on their way: skeleton rows while the list is empty, a spinner while it is not. */
	loading?: boolean;
	/** What to show when nothing matches. A function gets the query. */
	empty?: ReactNode | ((query: string) => ReactNode);
	/** Recent command ids, newest first (controlled). */
	recent?: string[];
	defaultRecent?: string[];
	onRecentChange?: (recent: string[]) => void;
	/** How many recent commands to keep and list above the rest. 0 turns them off. Default 5. */
	recentLimit?: number;
	recentLabel?: string;
	/** Tabs to narrow the list to one group of the current page. */
	scopes?: boolean;
	/** The first scope tab's label. Default "All". */
	allLabel?: string;
	/** The keyboard hints along the bottom. Default true. */
	hints?: boolean;
	/** Show the Escape key in the field and the hints, for a palette in a dialog. */
	escapeHint?: boolean;
	/** Draw the raised popover surface around the panel. Default true; the dialog draws its own. */
	surface?: boolean;
	/** Focus the search field when the panel mounts. */
	focusOnMount?: boolean;
	className?: string;
	ref?: Ref<HTMLDivElement>;
};

const NONE: string[] = [];
const NO_ITEMS: CommandItem[] = [];

/** The scope tab for every group; no group name can be it. */
const ALL = "\u0000all";

/** One controlled-or-uncontrolled value, the way the other components hold theirs. */
function useControllable<T>(value: T | undefined, initial: T, onChange?: (next: T) => void) {
	const [inner, setInner] = useState(initial);
	const controlled = value !== undefined;
	const current = controlled ? value : inner;
	const set = (next: T) => {
		if (!controlled) setInner(next);
		onChange?.(next);
	};
	return [current, set] as const;
}

/** The label with its matched letters in `<mark>`, one per run. */
function Highlighted({ text, match }: { text: string; match: number[] }) {
	if (!match.length) return text;
	const marked = new Set(match);
	const parts: ReactNode[] = [];
	let start = 0;
	for (let i = 1; i <= text.length; i++) {
		if (i < text.length && marked.has(i) === marked.has(start)) continue;
		const piece = text.slice(start, i);
		parts.push(
			marked.has(start) ? (
				<mark key={start} className={commandParts.match}>
					{piece}
				</mark>
			) : (
				piece
			),
		);
		start = i;
	}
	return parts;
}

function Keys({ keys }: { keys: ReactNode[] }) {
	return (
		<span className="flex shrink-0 items-center gap-1">
			{keys.map((key, i) => (
				// oxlint-disable-next-line react/no-array-index-key -- keys can repeat, such as ⇧ ⇧
				<kbd key={i} className={commandParts.kbd}>
					{key}
				</kbd>
			))}
		</span>
	);
}

/**
 * A searchable list of commands: a combobox field over a listbox (`aria-activedescendant`), fuzzy
 * filtering, groups, recent commands, nested pages, loading and empty states, and keyboard hints.
 * Use it inline, or let `CommandBlock` put it in a dialog behind ⌘K.
 */
export function CommandPanel({
	commands,
	onSelect,
	onClose,
	label = "Commands",
	placeholder = "Type a command or search…",
	query: queryProp,
	defaultQuery = "",
	onQueryChange,
	filter = true,
	loading = false,
	empty,
	recent: recentProp,
	defaultRecent = NONE,
	onRecentChange,
	recentLimit = 5,
	recentLabel = "Recent",
	scopes = false,
	allLabel = "All",
	hints = true,
	escapeHint = false,
	surface = true,
	focusOnMount = false,
	className,
	ref,
}: CommandPanelProps) {
	const base = useId();
	const listId = `${base}-list`;
	const hintId = `${base}-hint`;
	const inputRef = useRef<HTMLInputElement>(null);
	const viewportRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLDivElement>(null);
	// Only the arrow keys scroll the active row into view; the pointer is already on it.
	const scrollOnMove = useRef(false);

	const [pages, setPages] = useState<CommandItem[]>([]);
	const page = pages.at(-1);
	const [query, setQueryValue] = useControllable(queryProp, defaultQuery);
	const [recent, setRecent] = useControllable(recentProp, defaultRecent, onRecentChange);
	const [scope, setScope] = useState("");
	const [activeKey, setActiveKey] = useState<string | null>(null);
	const [loaded, setLoaded] = useState<Record<string, CommandItem[]>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const setQuery = (next: string, on: CommandItem | undefined = page) => {
		setQueryValue(next);
		setActiveKey(null);
		onQueryChange?.(next, on);
	};

	const pageItems = useMemo(
		() =>
			!page ? commands : Array.isArray(page.items) ? page.items : (loaded[page.id] ?? NO_ITEMS),
		[page, commands, loaded],
	);
	const error = page ? errors[page.id] : undefined;
	const pageLoading = !!page && typeof page.items === "function" && !(page.id in loaded) && !error;
	const busy = loading || pageLoading;

	const groups = useMemo(() => (scopes ? commandGroups(pageItems) : []), [scopes, pageItems]);
	const activeScope = groups.includes(scope) ? scope : "";

	const sections = useMemo(
		() =>
			commandSections({
				items: pageItems,
				query,
				root: !page,
				recent: recentLimit > 0 ? recent : [],
				recentLabel,
				scope: activeScope || undefined,
				filter,
			}),
		[pageItems, query, page, recentLimit, recent, recentLabel, activeScope, filter],
	);
	const rows = useMemo(() => sections.flatMap((section) => section.rows), [sections]);
	const enabled = rows.filter((row) => !row.item.disabled);
	const active = enabled.find((row) => row.key === activeKey) ?? enabled[0];
	const optionId = (row: CommandRow) => `${base}-o${rows.indexOf(row)}`;
	const hasIcons = rows.some((row) => row.item.icon || row.key.startsWith("recent:"));

	useEffect(() => {
		if (focusOnMount) inputRef.current?.focus();
	}, [focusOnMount]);

	// The viewport eases its height to the content's: script measures, CSS animates `--_h`.
	useLayoutEffect(() => {
		const viewport = viewportRef.current;
		const content = measureRef.current;
		if (!viewport || !content || typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(() => {
			const height = content.offsetHeight;
			// A closed dialog measures 0; keep the last height so reopening does not grow from 0.
			if (height > 0) viewport.style.setProperty("--_h", `${height}px`);
		});
		observer.observe(content);
		return () => observer.disconnect();
	}, []);

	useLayoutEffect(() => {
		if (!scrollOnMove.current || !active) return;
		scrollOnMove.current = false;
		if (active === enabled[0]) viewportRef.current?.scrollTo({ top: 0 });
		else document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
	});

	const load = (item: CommandItem) => {
		if (typeof item.items !== "function") return;
		setErrors((all) => {
			const next = { ...all };
			delete next[item.id];
			return next;
		});
		item.items().then(
			(list) => setLoaded((all) => ({ ...all, [item.id]: list })),
			(reason: unknown) =>
				setErrors((all) => ({
					...all,
					[item.id]: reason instanceof Error ? reason.message : "These commands did not load.",
				})),
		);
	};

	const goTo = (next: CommandItem[]) => {
		setPages(next);
		setScope("");
		setQuery("", next.at(-1));
		viewportRef.current?.scrollTo({ top: 0 });
		inputRef.current?.focus();
	};

	const run = (row: CommandRow) => {
		const { item, parents } = row;
		if (item.disabled) return;
		if (item.items) {
			goTo([...pages, ...parents, item]);
			if (typeof item.items === "function" && !(item.id in loaded)) load(item);
			return;
		}
		item.onSelect?.(item);
		onSelect?.(item, [...pages, ...parents]);
		if (recentLimit > 0) setRecent(pushRecent(recent, item.id, recentLimit));
		if (!item.keepOpen) onClose?.();
	};

	const move = (to: CommandRow | undefined) => {
		if (!to) return;
		scrollOnMove.current = true;
		setActiveKey(to.key);
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.nativeEvent.isComposing) return;
		const at = active ? enabled.indexOf(active) : -1;
		const count = enabled.length;
		let handled = true;
		if (event.key === "ArrowDown") move(enabled[(at + 1) % count]);
		else if (event.key === "ArrowUp") move(enabled[(at - 1 + count) % count]);
		else if (event.key === "Home") move(enabled[0]);
		else if (event.key === "End") move(enabled[count - 1]);
		else if (event.key === "Enter") {
			if (active) run(active);
		} else if ((event.key === "Backspace" || event.key === "Escape") && pages.length && !query) {
			// On a page, Escape steps back instead of closing (a handled keydown is no close request).
			goTo(pages.slice(0, -1));
		} else handled = false;
		if (handled) event.preventDefault();
	};

	const announcement = busy
		? "Loading…"
		: error
			? error
			: query
				? rows.length
					? `${rows.length} ${rows.length === 1 ? "result" : "results"}`
					: "No results"
				: page
					? `${page.label}, ${rows.length} ${rows.length === 1 ? "command" : "commands"}`
					: "";

	const emptyContent = error ? (
		<>
			<p className="m-0">{error}</p>
			<Button variant="secondary" size="sm" onClick={() => page && load(page)}>
				Try again
			</Button>
		</>
	) : typeof empty === "function" ? (
		empty(query)
	) : (
		(empty ?? <p className="m-0">{query ? `No results for “${query}”.` : "No commands here."}</p>)
	);

	return (
		<div
			ref={ref}
			data-slot="command"
			className={cn(commandParts.root, surface && `rx-surface ${commandParts.surface}`, className)}
		>
			{pages.length ? (
				<nav aria-label="Pages" className={commandParts.crumbs}>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => goTo(pages.slice(0, -1))}
						aria-label={`Back to ${pages.at(-2)?.label ?? label}`}
					>
						<ChevronLeftIcon />
						Back
					</Button>
					<ol className="m-0 flex min-w-0 list-none items-center gap-1 p-0">
						{pages.map((item, i) => (
							<li key={item.id} className="flex min-w-0 items-center gap-1">
								{i > 0 ? <ChevronRightIcon className="size-3 shrink-0 opacity-60" /> : null}
								<Badge
									tone={i === pages.length - 1 ? "accent" : "neutral"}
									aria-current={i === pages.length - 1 ? "page" : undefined}
									className="truncate"
								>
									{item.label}
								</Badge>
							</li>
						))}
					</ol>
				</nav>
			) : null}

			<div className={commandParts.search}>
				<Input
					ref={inputRef}
					size="lg"
					variant="filled"
					leadingIcon={<SearchIcon />}
					trailingIcon={
						busy && rows.length ? (
							<span className={commandParts.spinner} />
						) : escapeHint ? (
							<kbd className={commandParts.kbd}>esc</kbd>
						) : undefined
					}
					role="combobox"
					aria-label={page ? `${label}: ${page.label}` : label}
					aria-expanded="true"
					aria-controls={listId}
					aria-activedescendant={active ? optionId(active) : undefined}
					aria-autocomplete="list"
					aria-describedby={hintId}
					aria-busy={busy || undefined}
					autoComplete="off"
					autoCorrect="off"
					spellCheck={false}
					enterKeyHint="go"
					placeholder={page?.placeholder ?? placeholder}
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					onKeyDown={onKeyDown}
				/>
				<span id={hintId} hidden>
					Up and down arrows move through the results, Enter chooses one
					{pages.length ? ", Backspace in an empty field goes back" : ""}.
				</span>
			</div>

			{groups.length > 1 ? (
				<Tabs
					value={activeScope || ALL}
					onValueChange={(value) => {
						setScope(value === ALL ? "" : value);
						setActiveKey(null);
					}}
					className={commandParts.scopes}
				>
					<TabsList variant="underline" size="sm" aria-label="Scope">
						<TabsTrigger value={ALL}>{allLabel}</TabsTrigger>
						{groups.map((name) => (
							<TabsTrigger key={name} value={name}>
								{name}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			) : null}

			<div ref={viewportRef} className={commandParts.viewport}>
				<div ref={measureRef}>
					<div
						role="listbox"
						id={listId}
						aria-label={label}
						aria-busy={busy || undefined}
						className={commandParts.list}
					>
						{sections.map((section, s) => {
							const headingId = `${base}-g${s}`;
							return (
								<div
									key={section.key}
									role={section.heading ? "group" : "presentation"}
									aria-labelledby={section.heading ? headingId : undefined}
									className={commandParts.group}
								>
									{section.heading ? (
										<div id={headingId} aria-hidden="true" className={commandParts.heading}>
											{section.heading}
										</div>
									) : null}
									{section.rows.map((row) => {
										const { item } = row;
										const isActive = row === active;
										const trail = labels(row.parents).join(" › ");
										const description = [trail, item.description].filter(Boolean).join(" · ");
										return (
											// Keyboard users stay in the field (aria-activedescendant); a click runs it.
											// oxlint-disable-next-line jsx-a11y/click-events-have-key-events
											<div
												key={row.key}
												id={optionId(row)}
												role="option"
												tabIndex={-1}
												aria-selected={isActive}
												aria-disabled={item.disabled || undefined}
												data-active={isActive ? "" : undefined}
												data-page={item.items ? "" : undefined}
												className={commandParts.item}
												onPointerMove={() => {
													if (!item.disabled && !isActive) setActiveKey(row.key);
												}}
												onMouseDown={(event) => event.preventDefault()}
												onClick={() => run(row)}
											>
												{hasIcons ? (
													<span className={commandParts.itemIcon} aria-hidden="true">
														{item.icon ?? (row.key.startsWith("recent:") ? <ClockIcon /> : null)}
													</span>
												) : null}
												<span className={commandParts.itemText}>
													<span className={commandParts.itemLabel}>
														<Highlighted text={item.label} match={row.match} />
													</span>
													{description ? (
														<span className={commandParts.itemDescription}>{description}</span>
													) : null}
												</span>
												{item.badge ? <Badge tone={item.badgeTone}>{item.badge}</Badge> : null}
												{item.shortcut?.length ? (
													<span aria-hidden="true">
														<Keys keys={item.shortcut} />
													</span>
												) : null}
												{item.items ? (
													<ChevronRightIcon className={commandParts.itemChevron} />
												) : null}
											</div>
										);
									})}
								</div>
							);
						})}
						<span className={commandParts.highlight} aria-hidden="true" />
					</div>
					{busy && !rows.length ? (
						<div aria-hidden="true">
							{Array.from({ length: SKELETON_ROWS }, (_, i) => (
								<div
									key={i}
									className={commandParts.skeleton}
									style={{ "--_i": i } as CSSProperties}
								>
									<span />
									<span />
								</div>
							))}
						</div>
					) : null}
					{!busy && !rows.length ? <div className={commandParts.empty}>{emptyContent}</div> : null}
				</div>
			</div>

			{hints ? (
				<div className={commandParts.footer} aria-hidden="true">
					<span>
						<Keys keys={[<ArrowUpIcon key="up" />, <ArrowDownIcon key="down" />]} />
						Navigate
					</span>
					<span>
						<Keys keys={[<EnterIcon key="enter" />]} />
						{active?.item.items ? "Open" : "Select"}
					</span>
					{pages.length ? (
						<span>
							<Keys keys={["⌫"]} />
							Back
						</span>
					) : escapeHint ? (
						<span>
							<Keys keys={["esc"]} />
							Close
						</span>
					) : null}
				</div>
			) : null}

			<p className="sr-only" aria-live="polite" aria-atomic="true">
				{announcement}
			</p>
		</div>
	);
}
