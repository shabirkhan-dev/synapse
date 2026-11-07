import { Switch } from "@rabtx/ui/switch";

export default function SwitchStates() {
	return (
		<div className="grid gap-3">
			<Switch>Off</Switch>
			<Switch defaultChecked>On</Switch>
			<Switch disabled>Location (managed by your admin)</Switch>
			<Switch disabled defaultChecked>
				Backups (required)
			</Switch>
		</div>
	);
}
