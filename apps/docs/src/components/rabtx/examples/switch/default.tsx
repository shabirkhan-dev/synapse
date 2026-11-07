import { Switch } from "@rabtx/ui/switch";

export default function SwitchDefault() {
	return (
		<div className="grid gap-3">
			<Switch defaultChecked>Wi-Fi</Switch>
			<Switch>Airplane mode</Switch>
		</div>
	);
}
