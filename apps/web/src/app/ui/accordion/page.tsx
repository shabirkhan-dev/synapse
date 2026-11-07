import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import CollapsibleDefault from "./_examples/collapsible";
import CollapsibleControlled from "./_examples/collapsible-controlled";
import AccordionControlled from "./_examples/controlled";
import AccordionDefault from "./_examples/default";
import AccordionFind from "./_examples/find";
import AccordionFlush from "./_examples/flush";
import AccordionMultiple from "./_examples/multiple";
import AccordionStates from "./_examples/states";
import AccordionVariants from "./_examples/variants";

export default function AccordionPage() {
	return (
		<Doc>
			<h1>Accordion</h1>
			<p>
				A stack of native <code>&lt;details&gt;</code> with one shared state. The open item lifts
				out of the stack on a bouncy spring, its height grows with <code>interpolate-size</code> and{" "}
				<code>::details-content</code>, and its content fades in out of a blur. Every animation is
				CSS.
			</p>
			<Example file="accordion/_examples/default.tsx" muted>
				<AccordionDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@rabtx/ui/accordion";\n\n<Accordion type="single" collapsible defaultValue="refunds">\n  <AccordionItem value="refunds">\n    <AccordionTrigger>Do you offer refunds?</AccordionTrigger>\n    <AccordionContent>Within 14 days of any charge.</AccordionContent>\n  </AccordionItem>\n</Accordion>`}</pre>
			<p>
				The trigger is the item&apos;s <code>&lt;summary&gt;</code>, so it comes first; everything
				after it folds. A single accordion gives its items one <code>name</code>, so the browser
				keeps one open even before hydration.
			</p>

			<h2>Variants</h2>
			<p>
				Separated (the default) is one joined stack the open item lifts out of. Cards makes every
				item its own card. Flush is a list divided by lines.
			</p>
			<Example file="accordion/_examples/variants.tsx" muted>
				<AccordionVariants />
			</Example>

			<h2>Multiple</h2>
			<Example file="accordion/_examples/multiple.tsx" muted>
				<AccordionMultiple />
			</Example>

			<h2>Flush</h2>
			<Example file="accordion/_examples/flush.tsx">
				<AccordionFlush />
			</Example>

			<h2>Collapsible and disabled</h2>
			<p>
				Without <code>collapsible</code> the open item stays open (its trigger reports{" "}
				<code>aria-disabled</code>). A disabled item is dimmed and skipped.
			</p>
			<Example file="accordion/_examples/states.tsx" muted>
				<AccordionStates />
			</Example>

			<h2>Controlled</h2>
			<Example file="accordion/_examples/controlled.tsx" muted>
				<AccordionControlled />
			</Example>

			<h2>Find in page</h2>
			<p>
				Closed content stays in the page. Find in page, a text fragment or a link to an id inside an
				item opens it (Chromium), and the accordion follows: try{" "}
				<a href="#returns-window" className="underline">
					#returns-window
				</a>
				.
			</p>
			<Example file="accordion/_examples/find.tsx" muted>
				<AccordionFind />
			</Example>

			<h2>Collapsible</h2>
			<p>
				One <code>&lt;details&gt;</code> on its own, gliding open with no overshoot. It works with
				no script; React holds the state so it can be controlled.
			</p>
			<Example file="accordion/_examples/collapsible.tsx">
				<CollapsibleDefault />
			</Example>
			<Example file="accordion/_examples/collapsible-controlled.tsx">
				<CollapsibleControlled />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					["Accordion type", '"single" | "multiple"', 'Defaults to "single".'],
					[
						"Accordion value / defaultValue",
						"string | string[]",
						'The open item ("" for none) or items. Controlled or uncontrolled.',
					],
					[
						"Accordion onValueChange",
						"(value) => void",
						"After every change, in the shape of value.",
					],
					["Accordion collapsible", "boolean", "Single only: the open item can close."],
					["Accordion variant", '"separated" | "cards" | "flush"', 'Defaults to "separated".'],
					["AccordionItem value", "string", "Identifies the item. Required."],
					["AccordionItem disabled", "boolean", "Dimmed, not toggled, skipped by the arrows."],
					["AccordionTrigger icon", "ReactNode", "A decorative icon before the title."],
					["Collapsible open / defaultOpen", "boolean", "Controlled or uncontrolled."],
					["Collapsible onOpenChange", "(open: boolean) => void", "The state asked for."],
					["Collapsible disabled", "boolean", "The trigger stops toggling."],
					["CollapsibleTrigger chevron", "boolean", "Draws the chevron. Defaults to true."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					Triggers are <code>&lt;summary&gt;</code> buttons with their expanded state; panels are{" "}
					<code>region</code>s named by their trigger.
				</li>
				<li>
					Enter and Space toggle. Up and down arrows move between triggers and wrap; Home and End
					jump to the ends; disabled items are skipped.
				</li>
				<li>Closed content is out of the accessibility tree and the Tab order.</li>
				<li>
					Reduced motion and <code>data-motion=&quot;off&quot;</code> keep every state but grow,
					turn and blur nothing.
				</li>
			</ul>
		</Doc>
	);
}
