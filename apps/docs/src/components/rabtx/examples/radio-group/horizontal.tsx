import { RadioGroup, RadioGroupItem } from "@rabtx/ui/radio-group";

export default function RadioGroupHorizontal() {
	return (
		<RadioGroup aria-label="Density" orientation="horizontal" defaultValue="comfortable">
			<RadioGroupItem value="compact">Compact</RadioGroupItem>
			<RadioGroupItem value="comfortable">Comfortable</RadioGroupItem>
			<RadioGroupItem value="spacious">Spacious</RadioGroupItem>
		</RadioGroup>
	);
}
