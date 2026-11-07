"use client";

import { Select, SelectItem } from "@rabtx/ui/select";
import { useState } from "react";

export default function SelectControlled() {
	const [status, setStatus] = useState("todo");

	return (
		<div className="grid w-64 gap-2">
			<Select aria-label="Status" value={status} onValueChange={setStatus}>
				<SelectItem value="todo">To do</SelectItem>
				<SelectItem value="doing">In progress</SelectItem>
				<SelectItem value="done">Done</SelectItem>
			</Select>
			<p className="text-xs text-muted-foreground">
				Value: <code>{status}</code>
			</p>
		</div>
	);
}
