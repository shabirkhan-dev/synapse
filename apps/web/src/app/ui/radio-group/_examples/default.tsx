import { RadioGroup, RadioGroupItem } from "@rabtx/ui/radio-group";

export default function RadioGroupDefault() {
	return (
		<RadioGroup aria-label="Plan" defaultValue="pro">
			<RadioGroupItem value="starter">Starter, free</RadioGroupItem>
			<RadioGroupItem value="pro">Pro, $12 a month</RadioGroupItem>
			<RadioGroupItem value="team">Team, $29 a month</RadioGroupItem>
			<RadioGroupItem value="legacy" disabled>
				Legacy plan
			</RadioGroupItem>
		</RadioGroup>
	);
}
