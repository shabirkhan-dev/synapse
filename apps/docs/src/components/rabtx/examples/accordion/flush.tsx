import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@rabtx/ui/accordion";

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

/** Rows divided by lines, for a FAQ inside a page or a settings panel. */
export default function AccordionFlush() {
	return (
		<Accordion variant="flush" collapsible defaultValue="plans" className="max-w-md">
			{FAQ.map((item) => (
				<AccordionItem key={item.value} value={item.value}>
					<AccordionTrigger>{item.q}</AccordionTrigger>
					<AccordionContent>{item.a}</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}
