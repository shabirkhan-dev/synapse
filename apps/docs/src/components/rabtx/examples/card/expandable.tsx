import { ExpandableCard } from "@rabtx/ui/card";

const faqs = [
	{
		q: "Can I change plans later?",
		a: "Yes. Upgrades apply at once and are prorated; downgrades start with the next billing period.",
	},
	{
		q: "Do you offer refunds?",
		a: "Within 14 days of any charge, no questions asked. Write to billing and we reverse it.",
	},
	{
		q: "Where is my data stored?",
		a: "In the EU by default. Team and Scale plans can pin a region per project.",
	},
];

export default function CardExpandable() {
	return (
		<div className="grid w-full max-w-md gap-2">
			{faqs.map((faq, index) => (
				<ExpandableCard key={faq.q} name="faq" title={faq.q} defaultOpen={index === 0}>
					<p className="text-muted-foreground">{faq.a}</p>
				</ExpandableCard>
			))}
		</div>
	);
}
