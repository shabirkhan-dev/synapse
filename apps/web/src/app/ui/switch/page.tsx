import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import SwitchControlled from "./_examples/controlled";
import SwitchDefault from "./_examples/default";
import SwitchField from "./_examples/field";
import SwitchRows from "./_examples/rows";
import SwitchRtl from "./_examples/rtl";
import SwitchSizes from "./_examples/sizes";
import SwitchStates from "./_examples/states";

export default function SwitchPage() {
	return (
		<Doc>
			<h1>Switch</h1>
			<p>
				A native checkbox drawn as a switch. Pressing stretches the thumb toward where it is going;
				releasing springs it across. Every animation is CSS.
			</p>
			<Example file="switch/_examples/default.tsx">
				<SwitchDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Switch } from "@rabtx/ui/switch";\n\n<Switch checked={on} onCheckedChange={setOn}>Wi-Fi</Switch>`}</pre>
			<p>
				With children, Switch wraps itself in a <code>label</code>, so the text names it and the
				whole row toggles it. Give a bare switch a <code>Field</code> or an aria-label.
			</p>
			<p>
				It is an <code>input type=&quot;checkbox&quot;</code> with{" "}
				<code>role=&quot;switch&quot;</code> and the HTML <code>switch</code> attribute, so forms
				submit it and Space toggles it.
			</p>

			<h2>Sizes</h2>
			<p>Tracks are 36 by 20, 48 by 28 and 56 by 32. Medium is the default.</p>
			<Example file="switch/_examples/sizes.tsx">
				<SwitchSizes />
			</Example>

			<h2>States</h2>
			<p>Disabled switches are dimmed, skipped by Tab and never move.</p>
			<Example file="switch/_examples/states.tsx">
				<SwitchStates />
			</Example>

			<h2>Field</h2>
			<p>
				Inside a <code>Field</code>, the label names it, the hint describes it and an error marks it
				invalid with a red edge.
			</p>
			<Example file="switch/_examples/field.tsx">
				<SwitchField />
			</Example>

			<h2>Controlled</h2>
			<Example file="switch/_examples/controlled.tsx">
				<SwitchControlled />
			</Example>

			<h2>Settings rows</h2>
			<p>
				Reverse the label to put the switch at the end of a row. The row is still one label, so a
				click anywhere toggles it.
			</p>
			<Example file="switch/_examples/rows.tsx">
				<SwitchRows />
			</Example>

			<h2>Right to left</h2>
			<p>The thumb travels the other way in right-to-left text.</p>
			<Example file="switch/_examples/rtl.tsx">
				<SwitchRtl />
			</Example>

			<h2>API</h2>
			<p>Everything a native checkbox takes, except type, size and role, plus:</p>
			<PropsTable
				rows={[
					["checked / defaultChecked", "boolean", "Controlled or uncontrolled state."],
					["onCheckedChange", "(checked: boolean) => void", "The new state after every toggle."],
					["size", '"sm" | "md" | "lg"', 'Track size. Defaults to "md".'],
					["disabled", "boolean", "Dimmed, not focusable, does not toggle."],
					["children", "ReactNode", "A label. Wraps the switch in a label element."],
					["className", "string", "On the label when there are children, otherwise on the switch."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					A real checkbox with the switch role: screen readers announce it as a switch, on or off,
					from its native checked state.
				</li>
				<li>Space toggles it. Keyboard focus shows a 2px ring.</li>
				<li>The small size keeps a 24px click area.</li>
				<li>
					Reduced motion and <code>data-motion=&quot;off&quot;</code> keep every state but move
					nothing.
				</li>
			</ul>
		</Doc>
	);
}
