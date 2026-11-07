import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@rabtx/ui/accordion";

/** Not collapsible: the open item stays open. The disabled item is dimmed and skipped. */
export default function AccordionStates() {
	return (
		<Accordion defaultValue="profile" className="max-w-md">
			<AccordionItem value="profile">
				<AccordionTrigger>Profile</AccordionTrigger>
				<AccordionContent>Your name, photo and the email people see.</AccordionContent>
			</AccordionItem>
			<AccordionItem value="billing" disabled>
				<AccordionTrigger>Billing (owners only)</AccordionTrigger>
				<AccordionContent>Invoices and the card on file.</AccordionContent>
			</AccordionItem>
			<AccordionItem value="security">
				<AccordionTrigger>Security</AccordionTrigger>
				<AccordionContent>Passkeys, two-step codes and active sessions.</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
