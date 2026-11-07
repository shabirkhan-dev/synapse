import { RadioGroup, RadioGroupItem } from "@rabtx/ui/radio-group";

export default function RadioGroupCards() {
	return (
		<div className="grid w-full max-w-md gap-6">
			<RadioGroup aria-label="Workspace plan" variant="card" defaultValue="team">
				<RadioGroupItem value="starter" description="For one person and a side project.">
					Starter
				</RadioGroupItem>
				<RadioGroupItem value="team" description="Shared projects and roles for up to 20.">
					Team
				</RadioGroupItem>
				<RadioGroupItem value="scale" disabled description="SSO and audit logs. Sold out.">
					Scale
				</RadioGroupItem>
			</RadioGroup>
			<RadioGroup
				aria-label="Billing"
				variant="card"
				size="sm"
				orientation="horizontal"
				defaultValue="yearly"
			>
				<RadioGroupItem value="monthly">Monthly</RadioGroupItem>
				<RadioGroupItem value="yearly">Yearly, 2 months free</RadioGroupItem>
			</RadioGroup>
		</div>
	);
}
