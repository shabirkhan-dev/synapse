import { Switch } from "@rabtx/ui/switch";

/** The same switch under each radius and depth mode, and with motion off. */
export default function SwitchModes() {
	return (
		<div className="grid gap-3">
			{(["sharp", "default", "round"] as const).map((radius) => (
				<div key={radius} data-radius={radius}>
					<Switch defaultChecked>Radius {radius}</Switch>
				</div>
			))}
			<div data-depth="flat">
				<Switch defaultChecked>Depth flat</Switch>
			</div>
			<div data-motion="off">
				<Switch>Motion off</Switch>
			</div>
		</div>
	);
}
