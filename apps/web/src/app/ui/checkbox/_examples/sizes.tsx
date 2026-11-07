import { Checkbox } from "@rabtx/ui/checkbox";

export default function CheckboxSizes() {
	return (
		<div className="grid gap-3">
			<Checkbox size="sm" defaultChecked>
				Small, 16px
			</Checkbox>
			<Checkbox size="md" defaultChecked>
				Medium, 20px
			</Checkbox>
			<Checkbox size="lg" defaultChecked>
				Large, 24px
			</Checkbox>
		</div>
	);
}
