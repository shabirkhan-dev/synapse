import { Field } from "@rabtx/ui/field";
import { Select, SelectItem } from "@rabtx/ui/select";

export default function SelectStates() {
	return (
		<div className="grid w-64 gap-4">
			<Field label="Plan" error="Choose a plan to continue.">
				<Select placeholder="Select a plan">
					<SelectItem value="free">Free</SelectItem>
					<SelectItem value="pro">Pro</SelectItem>
					<SelectItem value="team" disabled>
						Team (sold out)
					</SelectItem>
				</Select>
			</Field>
			<Select aria-label="Region" defaultValue="eu" disabled>
				<SelectItem value="eu">Europe</SelectItem>
			</Select>
		</div>
	);
}
