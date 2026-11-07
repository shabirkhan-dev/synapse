import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import TooltipAlignment from "./_examples/align";
import TooltipControlled from "./_examples/controlled";
import TooltipDefault from "./_examples/default";
import TooltipInline from "./_examples/inline";
import TooltipSides from "./_examples/sides";
import TooltipToolbar from "./_examples/toolbar";

export default function TooltipPage() {
	return (
		<Doc>
			<h1>Tooltip</h1>
			<p>
				A short label on hover and keyboard focus. It is a <code>popover=&quot;hint&quot;</code> in
				the top layer, placed against its trigger by CSS anchor positioning, and it grows in from
				that side on the unfold spring.
			</p>
			<Example file="tooltip/_examples/default.tsx">
				<TooltipDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@rabtx/ui/tooltip";\n\n<TooltipProvider>\n\t<Tooltip>\n\t\t<TooltipTrigger asChild><Button>Publish</Button></TooltipTrigger>\n\t\t<TooltipContent>Make this page public</TooltipContent>\n\t</Tooltip>\n</TooltipProvider>`}</pre>
			<p>
				Hover waits for the delay; keyboard focus shows it at once; a tap toggles it on a touch
				screen. Escape, blur, a press or leaving both the trigger and the label hides it.
			</p>

			<h2>Sides</h2>
			<p>
				The preferred <code>side</code>, flipped by <code>position-try-fallbacks</code> when there
				is no room. The arrow points at the trigger&apos;s center.
			</p>
			<Example file="tooltip/_examples/sides.tsx">
				<TooltipSides />
			</Example>

			<h2>Alignment</h2>
			<p>
				<code>align</code> lines it up with the start, center or end of the trigger.
			</p>
			<Example file="tooltip/_examples/align.tsx">
				<TooltipAlignment />
			</Example>

			<h2>Toolbar and shortcuts</h2>
			<p>
				<code>asLabel</code> names an icon-only button with its tooltip, and <code>TooltipKbd</code>{" "}
				draws the shortcut. After the first label the provider&apos;s skip delay opens the next ones
				at once.
			</p>
			<Example file="tooltip/_examples/toolbar.tsx">
				<TooltipToolbar />
			</Example>

			<h2>Controlled</h2>
			<p>
				<code>open</code> and <code>onOpenChange</code>.
			</p>
			<Example file="tooltip/_examples/controlled.tsx">
				<TooltipControlled />
			</Example>

			<h2>In text</h2>
			<p>Any focusable trigger, inside a paragraph. Long labels wrap at 20rem.</p>
			<Example file="tooltip/_examples/inline.tsx">
				<TooltipInline />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					[
						"TooltipProvider delayDuration",
						"number",
						"Hover time before opening, ms. Default 120.",
					],
					[
						"TooltipProvider skipDelayDuration",
						"number",
						"After one closes, the next opens at once for this long. Default 300.",
					],
					["open", "boolean", "Controlled, with onOpenChange. Or defaultOpen."],
					["onOpenChange", "(open: boolean) => void", "Every change."],
					["delayDuration", "number", "Overrides the provider for this tooltip."],
					["disabled", "boolean", "Never show. Default false."],
					["asLabel", "boolean", "Name the trigger instead of describing it. Default false."],
				]}
			/>
			<p>
				<code>TooltipContent</code> takes everything a <code>span</code> takes, plus:
			</p>
			<PropsTable
				rows={[
					["side", '"top" | "right" | "bottom" | "left"', "Preferred side. Default top."],
					["align", '"start" | "center" | "end"', "Along that side. Default center."],
					["sideOffset", "number", "Gap to the trigger in px. Default 6."],
					["arrow", "boolean", "Point at the trigger. Default false."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					<code>role=&quot;tooltip&quot;</code>, linked from the trigger with{" "}
					<code>aria-describedby</code> (or <code>aria-labelledby</code> with <code>asLabel</code>).
				</li>
				<li>
					Keyboard focus shows it, blur and Escape hide it; you can move the pointer onto the label.
				</li>
				<li>Reduced motion keeps a short fade; Motion off shows and hides it at once.</li>
			</ul>
		</Doc>
	);
}
