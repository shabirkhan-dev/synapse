import { Slider } from "@rabtx/ui/slider";

export default function SliderDefault() {
	return (
		<div className="grid w-72 gap-6">
			<Slider aria-label="Volume" defaultValue={[40]} showValue />
			<Slider aria-label="Price range" defaultValue={[20, 80]} showValue />
		</div>
	);
}
