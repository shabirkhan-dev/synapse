"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@rabtx/ui/accordion";
import { Button } from "@rabtx/ui/button";
import { useState } from "react";

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

export default function AccordionControlled() {
	const [open, setOpen] = useState("plans");
	return (
		<div className="grid w-full max-w-md gap-3">
			<div className="flex flex-wrap items-center gap-2">
				{FAQ.map((item) => (
					<Button
						key={item.value}
						size="sm"
						variant={open === item.value ? "primary" : "outline"}
						onClick={() => setOpen(item.value)}
					>
						{item.value}
					</Button>
				))}
				<Button size="sm" variant="ghost" onClick={() => setOpen("")}>
					Close all
				</Button>
			</div>
			<Accordion collapsible value={open} onValueChange={setOpen}>
				{FAQ.map((item) => (
					<AccordionItem key={item.value} value={item.value}>
						<AccordionTrigger>{item.q}</AccordionTrigger>
						<AccordionContent>{item.a}</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
			<p className="text-sm text-muted-foreground">Open: {open || "none"}</p>
		</div>
	);
}
