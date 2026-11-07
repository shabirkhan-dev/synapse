"use client";

import { Slider } from "@rabtx/ui/slider";

export default function SliderBubble() {
	return (
		<div className="grid w-72 gap-6">
			<Slider aria-label="Opacity" defaultValue={[70]} showValue formatValue={(v) => `${v}%`} />
			<Slider
				aria-label="Temperature"
				defaultValue={[18, 24]}
				min={10}
				max={30}
				step={0.5}
				showValue="always"
				formatValue={(v) => `${v.toFixed(1)}°`}
			/>
		</div>
	);
}
