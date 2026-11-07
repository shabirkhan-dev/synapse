import { isValidElement, type MouseEvent, type ReactNode } from "react";

/** What a toast is about. It picks the icon and its tint, and errors are announced at once. */
export type ToastType = "default" | "success" | "error" | "warning" | "info" | "loading";

export type ToastId = string | number;

/** A button on a toast. It dismisses the toast after `onClick`, unless that calls `preventDefault()`. */
export type ToastButton = {
	label: ReactNode;
	onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export type ToastOptions = {
	/** Pass an existing id to update that toast in place instead of adding one. */
	id?: ToastId;
	description?: ReactNode;
	/** The main button, drawn as our primary `Button`. */
	action?: ToastButton;
	/** A quieter button beside it, drawn as a ghost `Button`. */
	cancel?: ToastButton;
	/** Milliseconds on screen. `Infinity` keeps it until it is dismissed. Defaults to the Toaster's. */
	duration?: number;
	/** Replaces the type's icon. `null` shows none. */
	icon?: ReactNode;
	/** `false` hides the close button and ignores swipes and Escape. Default `true`. */
	dismissible?: boolean;
	/** Announce at once (assertive), like an error. */
	important?: boolean;
	/** Which `<Toaster id>` shows it, when a page has more than one. */
	toaster?: string;
	className?: string;
	/** Called when it is dismissed by the person (close, swipe, Escape, a button) or by code. */
	onDismiss?: (toast: ToastData) => void;
	/** Called when its timer runs out. */
	onAutoClose?: (toast: ToastData) => void;
};

export type ToastData = Omit<ToastOptions, "id"> & {
	id: ToastId;
	type: ToastType;
	title: ReactNode;
	/** Bumped on every update, so the toast re-announces and its timer restarts. */
	version: number;
	/** Set once it starts to leave; it is removed after its exit transition. */
	removing?: boolean;
	createdAt: number;
};

type PromiseMessage<T> = ReactNode | ((value: T) => ReactNode);
/** A message, a set of options with a title, or a function of the value returning either. */
type PromiseState<T> = ReactNode | PromiseConfig<T> | ((value: T) => ReactNode | PromiseConfig<T>);

export type ToastPromiseOptions<T> = Omit<ToastOptions, "duration"> & {
	loading: ReactNode;
	success: PromiseState<T>;
	error: PromiseState<unknown>;
	/** Runs after it settles, either way. */
	finally?: () => void;
};

type Listener = () => void;

let counter = 0;
let toasts: readonly ToastData[] = [];
const listeners = new Set<Listener>();
const claims = new Map<string, symbol>();

function emit() {
	for (const listener of listeners) listener();
}

/** The default Toaster id. */
export const DEFAULT_TOASTER = "default";

/** The toast store every `Toaster` reads and every `toast()` call writes. */
export const toastStore = {
	subscribe(listener: Listener) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
	/** Newest first. A new array whenever anything changes, so React can compare by reference. */
	getSnapshot(): readonly ToastData[] {
		return toasts;
	},
	getServerSnapshot(): readonly ToastData[] {
		return EMPTY;
	},
	/** Adds a toast, or updates the one with the same id. Returns its id. */
	upsert(type: ToastType, title: ReactNode, options: ToastOptions = {}): ToastId {
		const { id: given, ...rest } = options;
		const existing = given === undefined ? undefined : toasts.find((t) => t.id === given);
		if (existing) {
			const next: ToastData = {
				...existing,
				...rest,
				type,
				title,
				removing: false,
				version: existing.version + 1,
			};
			// A loading toast that becomes a result gets the normal timer back unless told otherwise.
			if (existing.type === "loading" && type !== "loading" && !("duration" in rest)) {
				next.duration = undefined;
			}
			toasts = toasts.map((t) => (t.id === existing.id ? next : t));
			emit();
			return existing.id;
		}
		counter += 1;
		const id = given ?? counter;
		toasts = [{ ...rest, id, type, title, version: 0, createdAt: Date.now() }, ...toasts];
		emit();
		return id;
	},
	/**
	 * Starts the exit of one toast, or of every toast. The Toaster removes them once they leave.
	 * `auto` means the timer ran out: `onAutoClose` is called instead of `onDismiss`.
	 */
	dismiss(id?: ToastId, auto = false) {
		let changed = false;
		const leaving: ToastData[] = [];
		toasts = toasts.map((t) => {
			if (t.removing || (id !== undefined && t.id !== id)) return t;
			changed = true;
			leaving.push(t);
			return { ...t, removing: true };
		});
		if (!changed) return;
		emit();
		for (const t of leaving) (auto ? t.onAutoClose : t.onDismiss)?.(t);
	},
	/** Drops a toast for good (after its exit transition). */
	remove(id: ToastId) {
		const next = toasts.filter((t) => t.id !== id);
		if (next.length === toasts.length) return;
		toasts = next;
		emit();
	},
	/**
	 * One Toaster per id renders: the first to mount claims it and the rest stay empty until it
	 * unmounts. So an example, a layout and a page can each render `<Toaster />` safely.
	 */
	claim(toaster: string, token: symbol): boolean {
		const owner = claims.get(toaster);
		if (owner === undefined) {
			claims.set(toaster, token);
			return true;
		}
		return owner === token;
	},
	release(toaster: string, token: symbol) {
		if (claims.get(toaster) !== token) return;
		claims.delete(toaster);
		emit();
	},
	/** Empties the store and the claims. For tests. */
	reset() {
		toasts = [];
		claims.clear();
		counter = 0;
		emit();
	},
};

const EMPTY: readonly ToastData[] = [];

type PromiseConfig<T> = Omit<ToastOptions, "id" | "toaster"> & { title: PromiseMessage<T> };

const isConfig = <T>(state: unknown): state is PromiseConfig<T> =>
	state !== null && typeof state === "object" && !isValidElement(state) && "title" in state;

function resolve<T>(state: PromiseState<T>, value: T): { title: ReactNode; rest: ToastOptions } {
	const picked = typeof state === "function" ? state(value) : state;
	if (isConfig<T>(picked)) {
		const { title, ...rest } = picked;
		return { title: typeof title === "function" ? title(value) : title, rest };
	}
	return { title: picked, rest: {} };
}

function promise<T>(
	input: Promise<T> | (() => Promise<T>),
	{ loading, success, error, finally: settle, ...options }: ToastPromiseOptions<T>,
): ToastId {
	const id = toastStore.upsert("loading", loading, { ...options, duration: Infinity });
	const pending = typeof input === "function" ? input() : input;
	pending.then(
		(value) => {
			const { title, rest } = resolve(success, value);
			toastStore.upsert("success", title, { ...options, duration: undefined, ...rest, id });
		},
		(reason: unknown) => {
			const { title, rest } = resolve(error, reason);
			toastStore.upsert("error", title, { ...options, duration: undefined, ...rest, id });
		},
	);
	if (settle) void pending.finally(settle).catch(() => {});
	return id;
}

const typed = (type: ToastType) => (title: ReactNode, options?: ToastOptions) =>
	toastStore.upsert(type, title, options);

/**
 * Shows a toast in the `<Toaster>` on the page and returns its id. Call it from anywhere: an event
 * handler, a form action, a fetch callback. Pass an existing `id` to update a toast in place.
 *
 *   toast("Saved");
 *   toast.success("Invite sent", { description: "ada@example.com" });
 *   toast.promise(save(), { loading: "Saving…", success: "Saved", error: "Could not save" });
 */
export const toast = Object.assign(typed("default"), {
	success: typed("success"),
	error: typed("error"),
	warning: typed("warning"),
	info: typed("info"),
	/** A spinner that stays until you update it (same `id`) or dismiss it. */
	loading: (title: ReactNode, options?: ToastOptions) =>
		toastStore.upsert("loading", title, { duration: Infinity, ...options }),
	/** A loading toast that turns into success or error when the promise settles. */
	promise,
	/** Dismisses one toast, or all of them without an id. */
	dismiss: (id?: ToastId) => toastStore.dismiss(id),
});
