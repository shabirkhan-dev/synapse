import { Slider } from "@rabtx/ui/slider";

export default function SliderRtl() {
	return (
		<div dir="rtl" className="grid w-72 gap-6">
			<Slider aria-label="مستوى الصوت" defaultValue={[30]} showValue />
			<Slider aria-label="السعر" defaultValue={[20, 60]} marks={[0, 25, 50, 75, 100]} />
		</div>
	);
}
