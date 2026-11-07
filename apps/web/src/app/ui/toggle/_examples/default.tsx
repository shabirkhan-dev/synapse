import { Toggle } from "@rabtx/ui/toggle";

export default function ToggleDefault() {
	return (
		<div className="grid gap-3">
			<Toggle defaultChecked>Email notifications</Toggle>
			<Toggle>Weekly digest</Toggle>
			<Toggle disabled>Beta features (not available)</Toggle>
			<Toggle disabled defaultChecked>
				Security alerts (always on)
			</Toggle>
		</div>
	);
}
