import { Switch } from "@rabtx/ui/switch";

export default function SwitchSizes() {
	return (
		<div className="flex items-center gap-6">
			<Switch size="sm" aria-label="sm" defaultChecked />
			<Switch size="md" aria-label="md" defaultChecked />
			<Switch size="lg" aria-label="lg" defaultChecked />
		</div>
	);
}
