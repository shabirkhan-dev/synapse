"use client";

import { Toggle } from "@rabtx/ui/toggle";
import { useState } from "react";

export default function ToggleControlled() {
	const [on, setOn] = useState(true);

	return (
		<div className="grid gap-2">
			<Toggle checked={on} onChange={(event) => setOn(event.target.checked)}>
				Auto-save
			</Toggle>
			<span className="text-xs text-(--rx-text-secondary)">
				Changes are {on ? "saved automatically" : "saved when you press Save"}.
			</span>
		</div>
	);
}
