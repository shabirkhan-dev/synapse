import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import PopoverAlignExample from "./_examples/align";
import PopoverControlled from "./_examples/close";
import PopoverDefault from "./_examples/default";
import PopoverSides from "./_examples/sides";

export default function PopoverPage() {
	return (
		<Doc>
			<h1>Popover</h1>
			<p>
				A non-modal panel on the native Popover API, anchored to its trigger with CSS anchor
				positioning. The browser gives the top layer, a press outside, Escape and focus back to the
				trigger. It flips when it would not fit and unfolds from the side that touches the trigger,
				in CSS.
			</p>
			<Example file="popover/_examples/default.tsx">
				<PopoverDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import {\n\tPopover, PopoverContent, PopoverTrigger,\n} from "@rabtx/ui/popover";\n\n<Popover>\n\t<PopoverTrigger asChild><Button>Open</Button></PopoverTrigger>\n\t<PopoverContent side="bottom" align="center" sideOffset={8}>\n\t\t…\n\t</PopoverContent>\n</Popover>`}</pre>

			<h2>Sides</h2>
			<p>
				<code>side</code> picks the side of the trigger; <code>position-try-fallbacks</code> flips
				it when there is no room. The unfold always starts at the trigger.
			</p>
			<Example file="popover/_examples/sides.tsx">
				<PopoverSides />
			</Example>

			<h2>Align</h2>
			<p>
				<code>align</code> lines the panel up with the trigger&apos;s start edge, its center or its
				end edge.
			</p>
			<Example file="popover/_examples/align.tsx">
				<PopoverAlignExample />
			</Example>

			<h2>Controlled, with a close button</h2>
			<p>
				<code>open</code> and <code>onOpenChange</code> follow every change;{" "}
				<code>PopoverClose</code> is a native <code>popovertargetaction=&quot;hide&quot;</code>.
			</p>
			<Example file="popover/_examples/close.tsx">
				<PopoverControlled />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					["open", "boolean", "Controlled, with onOpenChange. Or defaultOpen."],
					["onOpenChange", "(open: boolean) => void", "Every change: trigger, Escape, outside."],
				]}
			/>
			<p>
				<code>PopoverContent</code>:
			</p>
			<PropsTable
				rows={[
					["side", '"top" | "right" | "bottom" | "left"', "Default bottom. Flips to fit."],
					["align", '"start" | "center" | "end"', "Default center."],
					["sideOffset", "number", "Gap to the trigger in px. Default 8."],
					["className", "string", "Classes for the panel (width, padding)."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					The trigger is a native invoker (<code>popovertarget</code>) with{" "}
					<code>aria-haspopup=&quot;dialog&quot;</code>, <code>aria-expanded</code> and{" "}
					<code>aria-controls</code>; it works before hydration.
				</li>
				<li>
					The panel is <code>role=&quot;dialog&quot;</code>, named by <code>PopoverTitle</code> and
					described by <code>PopoverDescription</code>. Focus moves to its first field on open and
					back to the trigger on Escape.
				</li>
				<li>Reduced motion only fades it; Motion off shows and hides it at once.</li>
			</ul>
		</Doc>
	);
}
