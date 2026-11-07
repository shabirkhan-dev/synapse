"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { NAV } from "./nav";

const MODES = {
	theme: ["light", "dark"],
	depth: ["flat", "floating"],
	radius: ["sharp", "default", "round"],
	motion: ["on", "off"],
};
type Modes = Record<keyof typeof MODES, string>;

/**
 * Sets the four modes on one wrapper, exactly how an app switches them. The `rabtx` class applies the
 * Rabtx theme to this subtree (the rest of the web app keeps its own theme); `dark` switches it.
 */
export function Shell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const [modes, setModes] = useState<Modes>({
		theme: "light",
		depth: "floating",
		radius: "default",
		motion: "on",
	});

	return (
		<div
			data-depth={modes.depth}
			data-radius={modes.radius}
			data-motion={modes.motion}
			className={`rabtx ${modes.theme} min-h-dvh bg-background text-foreground`}
		>
			<header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-input bg-background px-5 py-3">
				<Link href="/ui" className="text-sm font-medium">
					Rabtx UI
				</Link>
				<div className="flex flex-wrap gap-2">
					{Object.entries(MODES).map(([mode, values]) => (
						<fieldset key={mode} className="flex gap-0.5 rounded-[10px] bg-muted p-0.5">
							<legend className="sr-only">{mode}</legend>
							{values.map((value) => (
								<label
									key={value}
									className="cursor-pointer rounded-[8px] px-2.5 py-1 text-[13px] text-muted-foreground capitalize has-checked:bg-card has-checked:text-foreground has-checked:shadow-[0_0_0_1px_var(--input)] has-focus-visible:outline-2 has-focus-visible:outline-ring"
								>
									<input
										type="radio"
										name={mode}
										value={value}
										checked={modes[mode as keyof Modes] === value}
										onChange={() => setModes((current) => ({ ...current, [mode]: value }))}
										className="sr-only"
									/>
									{value}
								</label>
							))}
						</fieldset>
					))}
				</div>
			</header>
			<div className="mx-auto flex max-w-6xl flex-col md:flex-row">
				<nav aria-label="Docs" className="p-5 md:w-56 md:flex-none md:py-8">
					{NAV.map(({ title, links }) => (
						<div key={title} className="mb-4">
							<p className="mb-1 text-xs font-medium text-(--subtle-foreground)">{title}</p>
							{links.map(({ href, label }) => (
								<Link
									key={href}
									href={href}
									aria-current={pathname === href ? "page" : undefined}
									className="block rounded-[8px] px-2 py-1 text-[13px] text-muted-foreground hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
								>
									{label}
								</Link>
							))}
						</div>
					))}
				</nav>
				<main className="min-w-0 flex-1 px-5 pt-2 pb-24 md:py-8 md:pr-10">{children}</main>
			</div>
		</div>
	);
}
