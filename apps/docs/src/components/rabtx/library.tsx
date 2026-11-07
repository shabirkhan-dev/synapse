"use client";

import { usePathname, useRouter } from "next/navigation";
import {
	createContext,
	type ReactNode,
	use,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { cn } from "@/lib/cn";
import { UiCanvas } from "./canvas";

export type LibraryView = "docs" | "ui";

const COOKIE = "rabtx-docs-view";

const LibraryContext = createContext<{
	view: LibraryView;
	setView: (view: LibraryView) => void;
} | null>(null);

function useLibrary() {
	const value = use(LibraryContext);
	if (!value) throw new Error("Library view is only available inside the docs layout.");
	return value;
}

function writeViewCookie(view: LibraryView) {
	document.cookie = `${COOKIE}=${view}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

/**
 * Docs keeps the written page. UI replaces a component page with one floating canvas.
 * The cookie is the first paint; `?view=` on a shared link wins after that.
 */
export function LibraryProvider({
	initial,
	children,
}: {
	initial: LibraryView;
	children: ReactNode;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const [view, setViewState] = useState<LibraryView>(initial);

	useEffect(() => {
		function syncFromUrl() {
			const query = new URLSearchParams(window.location.search).get("view");
			if (query !== "ui" && query !== "docs") return;
			writeViewCookie(query);
			setViewState(query);
		}
		syncFromUrl();
		window.addEventListener("popstate", syncFromUrl);
		return () => window.removeEventListener("popstate", syncFromUrl);
	}, []);

	const setView = useCallback(
		(next: LibraryView) => {
			writeViewCookie(next);
			setViewState(next);
			const params = new URLSearchParams(window.location.search);
			if (next === "ui") params.set("view", "ui");
			else params.delete("view");
			const query = params.toString();
			const path = next === "ui" && !pathname.startsWith("/docs/ui") ? "/docs/ui" : pathname;
			router.replace(query ? `${path}?${query}` : path, { scroll: false });
		},
		[pathname, router],
	);

	const value = useMemo(() => ({ view, setView }), [view, setView]);
	return <LibraryContext value={value}>{children}</LibraryContext>;
}

export function ViewSwitch({ className }: { className?: string }) {
	const { view, setView } = useLibrary();
	const options = [
		["docs", "Docs"],
		["ui", "UI"],
	] as const;

	return (
		<div
			role="group"
			aria-label="Library"
			className={cn("flex w-fit gap-0.5 rounded-full bg-fd-muted p-0.5", className)}
		>
			{options.map(([id, label]) => (
				<button
					key={id}
					type="button"
					aria-pressed={view === id}
					onClick={() => setView(id)}
					className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium text-fd-muted-foreground aria-pressed:bg-fd-background aria-pressed:text-fd-foreground aria-pressed:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary"
				>
					{label}
				</button>
			))}
		</div>
	);
}

/** On a UI page, UI view swaps the article for the canvas. Other pages stay written. */
export function LibraryFrame({ children }: { children: ReactNode }) {
	const { view } = useLibrary();
	const pathname = usePathname();
	const uiPage = pathname === "/docs/ui" || pathname.startsWith("/docs/ui/");
	if (view === "ui" && uiPage) return <UiCanvas />;
	return children;
}
