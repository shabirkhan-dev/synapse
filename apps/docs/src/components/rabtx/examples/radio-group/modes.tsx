import { RadioGroup, RadioGroupItem } from "@rabtx/ui/radio-group";

/** Choice cards under each radius mode, and a group with motion off. Modes are ancestor attributes. */
export default function RadioGroupModes() {
	return (
		<div className="grid w-full max-w-md gap-4">
			{(["sharp", "default", "round"] as const).map((radius) => (
				<div key={radius} data-radius={radius}>
					<RadioGroup aria-label={`Radius ${radius}`} variant="card" size="sm" defaultValue="a">
						<RadioGroupItem value="a">Radius {radius}</RadioGroupItem>
					</RadioGroup>
				</div>
			))}
			<div data-motion="off">
				<RadioGroup aria-label="Motion off" orientation="horizontal" defaultValue="a">
					<RadioGroupItem value="a">Motion off</RadioGroupItem>
					<RadioGroupItem value="b">Jumps at once</RadioGroupItem>
				</RadioGroup>
			</div>
		</div>
	);
}
