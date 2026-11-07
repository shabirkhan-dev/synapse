"use client";

import { Slider } from "@rabtx/ui/slider";
import { useState } from "react";

export default function SliderControlled() {
	const [price, setPrice] = useState([200, 800]);
	const [committed, setCommitted] = useState(price);

	return (
		<div className="grid w-72 gap-3">
			<Slider
				aria-label="Price"
				value={price}
				onValueChange={setPrice}
				onValueCommit={setCommitted}
				min={0}
				max={1000}
				step={10}
				minStepsBetweenThumbs={10}
				formatValue={(v) => `$${v}`}
			/>
			<p className="text-[13px] text-muted-foreground">
				${price[0]} to ${price[1]} (last committed ${committed[0]} to ${committed[1]})
			</p>
		</div>
	);
}
