import { Field } from "@rabtx/ui/field";
import { RadioGroup, RadioGroupItem } from "@rabtx/ui/radio-group";

export default function RadioGroupStates() {
	return (
		<div className="grid gap-6">
			<RadioGroup aria-label="States" orientation="horizontal" defaultValue="on">
				<RadioGroupItem value="off">Not chosen</RadioGroupItem>
				<RadioGroupItem value="on">Chosen</RadioGroupItem>
			</RadioGroup>
			<RadioGroup aria-label="Disabled group" orientation="horizontal" defaultValue="on" disabled>
				<RadioGroupItem value="off">Not chosen, disabled</RadioGroupItem>
				<RadioGroupItem value="on">Chosen, disabled</RadioGroupItem>
			</RadioGroup>
			<Field label="Shipping" error="Choose a shipping speed to continue.">
				<RadioGroup>
					<RadioGroupItem value="standard">Standard</RadioGroupItem>
					<RadioGroupItem value="express">Express</RadioGroupItem>
				</RadioGroup>
			</Field>
		</div>
	);
}
