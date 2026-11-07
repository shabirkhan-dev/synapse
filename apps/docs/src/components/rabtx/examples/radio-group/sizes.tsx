import { RadioGroup, RadioGroupItem } from "@rabtx/ui/radio-group";

export default function RadioGroupSizes() {
	return (
		<div className="flex flex-wrap gap-10">
			{(
				[
					["sm", "Small, 16px"],
					["md", "Medium, 20px"],
					["lg", "Large, 24px"],
				] as const
			).map(([size, label]) => (
				<RadioGroup key={size} size={size} aria-label={label} defaultValue="a">
					<RadioGroupItem value="a">{label}</RadioGroupItem>
					<RadioGroupItem value="b">Another option</RadioGroupItem>
				</RadioGroup>
			))}
		</div>
	);
}
