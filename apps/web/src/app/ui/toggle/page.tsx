import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import ToggleControlled from "./_examples/controlled";
import ToggleDefault from "./_examples/default";

export default function TogglePage() {
	return (
		<Doc>
			<h1>Toggle</h1>
			<p>An on/off switch for settings that apply at once.</p>
			<Example file="toggle/_examples/default.tsx">
				<ToggleDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Toggle } from "@rabtx/ui/toggle";\n\n<Toggle defaultChecked>Email notifications</Toggle>`}</pre>
			<p>
				Toggle is a native checkbox with the <code>switch</code> role, so screen readers say
				&quot;on&quot; or &quot;off&quot; instead of &quot;checked&quot;. With children it wraps the
				track in a <code>label</code>; without, give it an <code>aria-label</code>. Use a Toggle
				when the change takes effect immediately, and a Checkbox when it waits for a Save.
			</p>

			<h2>Controlled</h2>
			<p>
				It takes <code>checked</code> and <code>onChange</code> like any input. The thumb slides on
				the switch spring, with no JavaScript doing the animation.
			</p>
			<Example file="toggle/_examples/controlled.tsx">
				<ToggleControlled />
			</Example>

			<h2>API</h2>
			<p>Everything a native checkbox takes, plus:</p>
			<PropsTable
				rows={[
					["children", "ReactNode", "A label. Wraps the track in a label element."],
					["className", "string", "On the label when there are children, otherwise on the track."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>Space toggles it. It is announced as a switch with an on or off state.</li>
				<li>Keyboard focus shows a 2px ring. The click area is 24px tall.</li>
				<li>With Motion off, or reduced motion, the thumb jumps with no slide.</li>
				<li>The radius follows the page mode: round by default, square in Sharp.</li>
			</ul>
		</Doc>
	);
}
