import { Slider, sliderSizes } from "@rabtx/ui/slider";

export default function SliderSizes() {
	return (
		<div className="grid w-72 gap-4">
			{sliderSizes.map((size) => (
				<Slider key={size} size={size} aria-label={size} defaultValue={[60]} />
			))}
		</div>
	);
}
