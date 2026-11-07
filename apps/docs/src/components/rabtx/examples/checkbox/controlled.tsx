"use client";

import { Checkbox } from "@rabtx/ui/checkbox";
import { useState } from "react";

export default function CheckboxControlled() {
	const [agreed, setAgreed] = useState(false);

	return (
		<div className="grid gap-2">
			<Checkbox checked={agreed} onCheckedChange={setAgreed}>
				I agree to the terms
			</Checkbox>
			<p className="text-xs text-muted-foreground">
				Checked: <code>{String(agreed)}</code>
			</p>
		</div>
	);
}
