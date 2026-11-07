import { Slider } from "@rabtx/ui/slider";

const bands = [
	{ label: "Bass", value: 70 },
	{ label: "Mid", value: 45 },
	{ label: "Treble", value: 60 },
];

export default function SliderVertical() {
	return (
		<div className="flex h-48 gap-8">
			{bands.map((band) => (
				<Slider
					key={band.label}
					orientation="vertical"
					aria-label={band.label}
					defaultValue={[band.value]}
					showValue
				/>
			))}
			<Slider orientation="vertical" aria-label="Band" defaultValue={[30, 70]} showValue />
		</div>
	);
}
