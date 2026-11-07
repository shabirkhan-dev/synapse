"use client";

import { Button } from "@rabtx/ui/button";
import { Field } from "@rabtx/ui/field";
import { Slider } from "@rabtx/ui/slider";
import { useState } from "react";

export default function SliderForm() {
	const [sent, setSent] = useState("");

	return (
		<form
			className="grid w-72 gap-5"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				setSent(`volume=${data.get("volume")} price=${data.getAll("price").join(",")}`);
			}}
		>
			<Field label="Volume" hint="Arrow keys move it by 1, Page Up and Down by 10.">
				<Slider name="volume" defaultValue={[50]} showValue />
			</Field>
			<Field label="Price">
				<Slider name="price" defaultValue={[25, 75]} showValue formatValue={(v) => `$${v}`} />
			</Field>
			<Button type="submit" size="sm">
				Submit
			</Button>
			<output className="text-[13px] text-muted-foreground">{sent || "Not sent yet"}</output>
		</form>
	);
}
