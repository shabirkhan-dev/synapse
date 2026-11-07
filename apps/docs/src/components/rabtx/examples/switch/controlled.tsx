"use client";

import { Switch } from "@rabtx/ui/switch";
import { useState } from "react";

export default function SwitchControlled() {
	const [on, setOn] = useState(true);

	return (
		<div className="grid gap-2">
			<Switch checked={on} onCheckedChange={setOn}>
				Notifications
			</Switch>
			<p className="text-xs text-muted-foreground">
				Notifications are <code>{on ? "on" : "off"}</code>
			</p>
		</div>
	);
}
