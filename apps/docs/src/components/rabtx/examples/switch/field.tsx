"use client";

import { Field } from "@rabtx/ui/field";
import { Switch } from "@rabtx/ui/switch";
import { useState } from "react";

export default function SwitchField() {
	const [terms, setTerms] = useState(false);

	return (
		<div className="grid w-72 gap-5">
			<Field label="Marketing emails" hint="At most one a month.">
				<Switch name="marketing" />
			</Field>
			<Field label="Accept the terms" error={terms ? undefined : "Turn this on to continue."}>
				<Switch checked={terms} onCheckedChange={setTerms} />
			</Field>
		</div>
	);
}
