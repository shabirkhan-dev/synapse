import {
	Archive01Icon,
	Calendar03Icon,
	File01Icon,
	Megaphone01Icon,
	PackageIcon,
	SecurityCheckIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@rabtx/ui/accordion";

const STEPS = [
	{
		value: "brief",
		title: "Release brief",
		icon: File01Icon,
		body: "Launch notes, owners and risks in one short handoff before the release window opens.",
	},
	{
		value: "checklist",
		title: "Launch checklist",
		icon: SecurityCheckIcon,
		body: "Copy, links, analytics, rollback steps and the final approvals, ticked off in one place.",
	},
	{
		value: "campaign",
		title: "Campaign notes",
		icon: Megaphone01Icon,
		body: "Notes for each channel, kept next to the task while the list stays calm and folded.",
	},
	{
		value: "calendar",
		title: "Rollout calendar",
		icon: Calendar03Icon,
		body: "Announcements, staging checks, reminders and quiet periods on the same timeline.",
	},
	{
		value: "ship",
		title: "Ship the build",
		icon: PackageIcon,
		body: "The current artifact, its deploy status and the sign-off before the release is done.",
	},
	{
		value: "archive",
		title: "Archive assets",
		icon: Archive01Icon,
		body: "Final copy, images and source files move to the campaign folder once rollout ends.",
	},
];

/** The open item lifts out of the stack; the rows around it round their facing corners. */
export default function AccordionDefault() {
	return (
		<Accordion type="single" collapsible defaultValue="calendar" className="max-w-sm">
			{STEPS.map((step) => (
				<AccordionItem key={step.value} value={step.value}>
					<AccordionTrigger icon={<HugeiconsIcon icon={step.icon} />}>
						{step.title}
					</AccordionTrigger>
					<AccordionContent>{step.body}</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}
