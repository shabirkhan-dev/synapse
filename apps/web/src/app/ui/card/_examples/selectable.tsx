import {
	Card,
	CardAction,
	CardDescription,
	CardHeader,
	CardTitle,
	cardParts,
} from "@rabtx/ui/card";

const plans = [
	{ id: "starter", name: "Starter", about: "For one person and a side project.", price: "$0" },
	{ id: "team", name: "Team", about: "Shared projects and roles for up to 20.", price: "$12" },
	{ id: "scale", name: "Scale (sold out)", about: "SSO and audit logs.", price: "$40", off: true },
];

export default function CardSelectable() {
	return (
		<fieldset className="grid w-full max-w-md gap-2">
			<legend className="mb-2 text-[13px] font-[510]">Plan</legend>
			{plans.map((plan) => (
				<Card key={plan.id} size="sm">
					<CardHeader>
						<CardTitle>
							<label className={`${cardParts.target} flex items-center gap-2`}>
								<input
									type="radio"
									name="plan"
									value={plan.id}
									defaultChecked={plan.id === "team"}
									disabled={plan.off}
									aria-describedby={`${plan.id}-about`}
									className="size-4 accent-(--primary)"
								/>
								{plan.name}
							</label>
						</CardTitle>
						<CardDescription id={`${plan.id}-about`} className="pl-6">
							{plan.about}
						</CardDescription>
						<CardAction className="text-[13px] font-[510] tabular-nums">{plan.price}</CardAction>
					</CardHeader>
				</Card>
			))}
		</fieldset>
	);
}
