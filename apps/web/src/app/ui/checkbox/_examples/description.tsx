import { Checkbox } from "@rabtx/ui/checkbox";

export default function CheckboxDescription() {
	return (
		<div className="grid max-w-72 gap-4">
			<Checkbox defaultChecked description="Replies on threads you started.">
				Comments
			</Checkbox>
			<Checkbox defaultChecked description="Whenever someone tags you by name.">
				Mentions
			</Checkbox>
			<Checkbox description="A summary of activity every Monday.">Weekly digest</Checkbox>
			<Checkbox disabled description="Add a phone number to enable.">
				SMS alerts
			</Checkbox>
		</div>
	);
}
