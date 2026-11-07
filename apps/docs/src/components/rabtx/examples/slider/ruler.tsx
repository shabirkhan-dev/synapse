"use client";

import { Slider } from "@rabtx/ui/slider";

const majors = [40, 50, 60, 70, 80, 90, 100, 110, 120].map((value) => ({
	value,
	label: String(value),
}));

export default function SliderRuler() {
	return (
		<div className="w-80">
			<Slider
				variant="ruler"
				aria-label="Weight"
				defaultValue={[72.5]}
				min={40}
				max={120}
				step={0.5}
				marks={majors}
				formatValue={(v) => `${v.toFixed(1)} kg`}
			/>
		</div>
	);
}
