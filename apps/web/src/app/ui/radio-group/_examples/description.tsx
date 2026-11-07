import { RadioGroup, RadioGroupItem } from "@rabtx/ui/radio-group";

export default function RadioGroupDescription() {
	return (
		<RadioGroup aria-label="Schedule" defaultValue="once" className="max-w-72">
			<RadioGroupItem value="once" description="Runs a single time, right now.">
				Run once
			</RadioGroupItem>
			<RadioGroupItem value="schedule" description="Repeats on an interval until you stop it.">
				Run on a schedule
			</RadioGroupItem>
			<RadioGroupItem value="trigger" description="Waits for an event before it starts.">
				Run on a trigger
			</RadioGroupItem>
			<RadioGroupItem value="manual" disabled description="Not available on your plan.">
				Manual approval
			</RadioGroupItem>
		</RadioGroup>
	);
}
