import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	type AccordionVariant,
} from "@rabtx/ui/accordion";

const VARIANTS: AccordionVariant[] = ["separated", "cards", "flush"];

const FAQ = [
	{
		value: "plans",
		q: "Can I change plans later?",
		a: "Yes. Upgrades apply at once and are prorated; downgrades start with the next billing period.",
	},
	{
		value: "refunds",
		q: "Do you offer refunds?",
		a: "Within 14 days of any charge, no questions asked. Write to billing and we reverse it.",
	},
	{
		value: "data",
		q: "Where is my data stored?",
		a: "In the EU by default. Team and Scale plans can pin a region per project.",
	},
];

/** The same questions as one joined stack, as separate cards and as a flush list. */
export default function AccordionVariants() {
	return (
		<div className="grid w-full max-w-md gap-6">
			{VARIANTS.map((variant) => (
				<div key={variant} className="grid gap-2">
					<p className="text-xs font-medium text-muted-foreground">{variant}</p>
					<Accordion variant={variant} collapsible defaultValue="refunds">
						{FAQ.map((item) => (
							<AccordionItem key={item.value} value={item.value}>
								<AccordionTrigger>{item.q}</AccordionTrigger>
								<AccordionContent>{item.a}</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			))}
		</div>
	);
}
