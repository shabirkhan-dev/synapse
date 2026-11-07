import { Slider } from "@rabtx/ui/slider";

/** The same slider under each radius and depth mode, and with motion off. */
export default function SliderModes() {
	return (
		<div className="grid w-72 gap-4">
			{(["sharp", "default", "round"] as const).map((radius) => (
				<div key={radius} data-radius={radius}>
					<Slider aria-label={`Radius ${radius}`} defaultValue={[30, 70]} />
				</div>
			))}
			<div data-depth="flat">
				<Slider aria-label="Depth flat" defaultValue={[60]} />
			</div>
			<div data-motion="off">
				<Slider aria-label="Motion off" defaultValue={[40]} showValue />
			</div>
		</div>
	);
}
