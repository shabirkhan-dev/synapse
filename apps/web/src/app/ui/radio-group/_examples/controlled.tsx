"use client";

import { RadioGroup, RadioGroupItem } from "@rabtx/ui/radio-group";
import { useState } from "react";

export default function RadioGroupControlled() {
	const [theme, setTheme] = useState("system");

	return (
		<div className="grid gap-3">
			<RadioGroup aria-label="Theme" value={theme} onValueChange={setTheme}>
				<RadioGroupItem value="light">Light</RadioGroupItem>
				<RadioGroupItem value="dark">Dark</RadioGroupItem>
				<RadioGroupItem value="system">System</RadioGroupItem>
			</RadioGroup>
			<p className="text-xs text-muted-foreground">
				Value: <code>{theme}</code>
			</p>
		</div>
	);
}
