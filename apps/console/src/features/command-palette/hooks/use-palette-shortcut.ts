import { useEffect } from "react";

/** ⌘K on a Mac, Ctrl+K elsewhere: toggles the palette from anywhere in the workspace. */
export function usePaletteShortcut(toggle: () => void) {
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				toggle();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [toggle]);
}
