import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@rabtx/ui/accordion";

function Small({ label }: { label: string }) {
	return (
		<Accordion collapsible defaultValue="a" className="w-60">
			<AccordionItem value="a">
				<AccordionTrigger>{label}</AccordionTrigger>
				<AccordionContent>Corners follow the radius mode.</AccordionContent>
			</AccordionItem>
			<AccordionItem value="b">
				<AccordionTrigger>Second</AccordionTrigger>
				<AccordionContent>Another item.</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}

/** The same accordion under each radius mode, flat, and with motion off. Modes are ancestor attributes. */
export default function AccordionModes() {
	return (
		<div className="flex flex-wrap items-start justify-center gap-4">
			{(["sharp", "default", "round"] as const).map((radius) => (
				<div key={radius} data-radius={radius}>
					<Small label={radius} />
				</div>
			))}
			<div data-depth="flat">
				<Small label="Flat" />
			</div>
			<div data-motion="off">
				<Small label="Motion off" />
			</div>
		</div>
	);
}
