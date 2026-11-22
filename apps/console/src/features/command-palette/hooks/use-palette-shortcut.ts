import { useEffect } from "react";

/**
 * ⌘K on a Mac, Ctrl+K elsewhere: toggles the palette from anywhere in the workspace. "/" opens it
 * too, unless the reader is typing (a field, an editable area) or uses another modifier.
 */
export function usePaletteShortcut(toggle: () => void) {
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				toggle();
				return;
			}
			if (
				event.key === "/" &&
				!event.metaKey &&
				!event.ctrlKey &&
				!event.altKey &&
				!typing(event)
			) {
				event.preventDefault();
				toggle();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [toggle]);
}

function typing(event: KeyboardEvent): boolean {
	const target = event.target;
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.isContentEditable ||
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement
	);
}
