"use client";

import { CheckmarkCircle02Icon, Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@synapse/ui/components/button";
import { useEffect, useState } from "react";

/** Copies `text` to the clipboard; says "Copied" for a moment (announced to screen readers). */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
	const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

	useEffect(() => {
		if (state === "idle") return;
		const timer = setTimeout(() => setState("idle"), 2000);
		return () => clearTimeout(timer);
	}, [state]);

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="gap-1.5 text-muted-foreground"
			onClick={() =>
				navigator.clipboard.writeText(text).then(
					() => setState("copied"),
					() => setState("failed"),
				)
			}
		>
			<HugeiconsIcon
				icon={state === "copied" ? CheckmarkCircle02Icon : Copy01Icon}
				strokeWidth={1.75}
				aria-hidden="true"
			/>
			<span aria-live="polite">
				{state === "copied" ? "Copied" : state === "failed" ? "Could not copy" : label}
			</span>
		</Button>
	);
}
