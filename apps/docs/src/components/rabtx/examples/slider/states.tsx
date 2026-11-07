import { Field } from "@rabtx/ui/field";
import { Slider } from "@rabtx/ui/slider";

export default function SliderStates() {
	return (
		<div className="grid w-72 gap-6">
			<Field label="Brightness" hint="Managed by your admin.">
				<Slider defaultValue={[30]} disabled />
			</Field>
			<Field label="Budget" error="Pick a budget of at least 20.">
				<Slider defaultValue={[10]} />
			</Field>
		</div>
	);
}
