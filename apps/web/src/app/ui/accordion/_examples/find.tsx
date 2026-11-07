import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@rabtx/ui/accordion";

/** Closed content is still in the page: find in page, or a link to text or an id in it, opens it. */
export default function AccordionFind() {
	return (
		<Accordion variant="cards" defaultValue="shipping" className="max-w-md">
			<AccordionItem value="shipping">
				<AccordionTrigger>Shipping</AccordionTrigger>
				<AccordionContent>Orders leave the warehouse within two working days.</AccordionContent>
			</AccordionItem>
			<AccordionItem value="returns">
				<AccordionTrigger>Returns</AccordionTrigger>
				<AccordionContent>
					<span id="returns-window">Send it back within thirty days</span> in its original box.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="warranty">
				<AccordionTrigger>Warranty</AccordionTrigger>
				<AccordionContent>Two years on parts and labour, worldwide.</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
