import { Checkbox } from "@rabtx/ui/checkbox";

/** The same checkbox under each radius mode, and with motion off. Modes are ancestor attributes. */
export default function CheckboxModes() {
	return (
		<>
			{(["sharp", "default", "round"] as const).map((radius) => (
				<div key={radius} data-radius={radius}>
					<Checkbox defaultChecked>{radius}</Checkbox>
				</div>
			))}
			<div data-motion="off">
				<Checkbox>Motion off</Checkbox>
			</div>
		</>
	);
}
