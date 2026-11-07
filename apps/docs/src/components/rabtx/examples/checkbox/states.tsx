import { Checkbox } from "@rabtx/ui/checkbox";
import { Field } from "@rabtx/ui/field";

export default function CheckboxStates() {
	return (
		<div className="grid gap-4">
			<div className="flex items-center gap-4">
				<Checkbox aria-label="Off" />
				<Checkbox aria-label="On" defaultChecked />
				<Checkbox aria-label="Partly on" checked="indeterminate" />
				<Checkbox aria-label="Off, disabled" disabled />
				<Checkbox aria-label="On, disabled" disabled defaultChecked />
			</div>
			<Checkbox disabled>Beta features (not available)</Checkbox>
			<Field label="Terms" error="Accept the terms to continue.">
				<Checkbox />
			</Field>
		</div>
	);
}
