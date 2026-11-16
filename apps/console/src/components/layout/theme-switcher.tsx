"use client";

import { ComputerIcon, Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const OPTIONS = [
	{ value: "light", label: "Light", icon: Sun01Icon },
	{ value: "dark", label: "Dark", icon: Moon02Icon },
	{ value: "system", label: "System", icon: ComputerIcon },
] as const;

/** Light, dark or follow the system: a three-way radio group. */
export function ThemeSwitcher() {
	const { theme, setTheme } = useTheme();
	// The stored choice is only known in the browser; render no selection on the server.
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const current = mounted ? (theme ?? "system") : null;

	return (
		<div
			role="radiogroup"
			aria-label="Theme"
			className="flex items-center gap-0.5 rounded-lg bg-sidebar-accent/60 p-0.5"
		>
			{OPTIONS.map((option) => {
				const checked = current === option.value;
				return (
					<button
						key={option.value}
						type="button"
						role="radio"
						aria-checked={checked}
						aria-label={option.label}
						title={option.label}
						onClick={() => setTheme(option.value)}
						className={`flex size-7 items-center justify-center rounded-md transition-colors duration-150 ${
							checked
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<HugeiconsIcon icon={option.icon} size={15} strokeWidth={1.75} aria-hidden="true" />
					</button>
				);
			})}
		</div>
	);
}
