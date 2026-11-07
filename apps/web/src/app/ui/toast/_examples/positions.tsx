"use client";

import { Button } from "@rabtx/ui/button";
import { Switch } from "@rabtx/ui/switch";
import { Toaster, type ToasterPosition, toast, toasterPositions } from "@rabtx/ui/toast";
import { useState } from "react";

export default function ToastPositions() {
	const [position, setPosition] = useState<ToasterPosition>("bottom-right");
	const [expand, setExpand] = useState(false);

	return (
		<div className="grid justify-items-center gap-4">
			<div className="flex flex-wrap justify-center gap-2">
				{toasterPositions.map((value) => (
					<Button
						key={value}
						size="sm"
						variant={value === position ? "primary" : "outline"}
						aria-pressed={value === position}
						onClick={() => {
							setPosition(value);
							toast(`Toast at ${value.replace("-", " ")}`, { toaster: "positions" });
						}}
					>
						{value}
					</Button>
				))}
			</div>
			<Switch checked={expand} onCheckedChange={setExpand} size="sm">
				Always fanned out
			</Switch>
			<Toaster
				id="positions"
				label="Position demo"
				hotkey={[]}
				position={position}
				expand={expand}
				visibleToasts={4}
				gap={10}
			/>
		</div>
	);
}
