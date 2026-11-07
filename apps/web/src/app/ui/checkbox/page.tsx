import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import CheckboxControlled from "./_examples/controlled";
import CheckboxDefault from "./_examples/default";
import CheckboxDescription from "./_examples/description";
import CheckboxIndeterminate from "./_examples/indeterminate";
import CheckboxSizes from "./_examples/sizes";
import CheckboxStates from "./_examples/states";

export default function CheckboxPage() {
	return (
		<Doc>
			<h1>Checkbox</h1>
			<p>
				A native checkbox. Checking it fills the box, pops the tick in and draws its stroke; a press
				springs the box down. Every animation is CSS.
			</p>
			<Example file="checkbox/_examples/default.tsx">
				<CheckboxDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Checkbox } from "@rabtx/ui/checkbox";\n\n<Checkbox checked={agreed} onCheckedChange={setAgreed}>I agree to the terms</Checkbox>`}</pre>
			<p>
				With children, Checkbox wraps the box in a <code>label</code>, so the text names it and the
				whole row is clickable. A bare checkbox needs an <code>aria-label</code> or a{" "}
				<code>Field</code>. The click target is at least 24px, whatever the size.
			</p>

			<h2>Sizes</h2>
			<p>Boxes are 16, 20 and 24. Medium is the default; the label text grows with the box.</p>
			<Example file="checkbox/_examples/sizes.tsx">
				<CheckboxSizes />
			</Example>

			<h2>Description</h2>
			<p>
				<code>description</code> adds a quieter line under the label. It is announced as the
				description, not as part of the name.
			</p>
			<Example file="checkbox/_examples/description.tsx">
				<CheckboxDescription />
			</Example>

			<h2>Indeterminate</h2>
			<p>
				<code>indeterminate</code> (or <code>checked=&quot;indeterminate&quot;</code>) draws a dash,
				for a &quot;select all&quot; above a list. It always follows your state, so compute it on
				every render.
			</p>
			<Example file="checkbox/_examples/indeterminate.tsx">
				<CheckboxIndeterminate />
			</Example>

			<h2>States</h2>
			<p>
				Off, on, partly on and disabled. In a Field, <code>error</code> turns the edge red and links
				the message.
			</p>
			<Example file="checkbox/_examples/states.tsx">
				<CheckboxStates />
			</Example>

			<h2>Controlled</h2>
			<Example file="checkbox/_examples/controlled.tsx">
				<CheckboxControlled />
			</Example>

			<h2>API</h2>
			<p>Everything a native checkbox takes, plus:</p>
			<PropsTable
				rows={[
					["checked", 'boolean | "indeterminate"', "Controlled state."],
					["defaultChecked", "boolean", "Uncontrolled initial state."],
					["onCheckedChange", "(checked: boolean) => void", "The new state after every change."],
					["indeterminate", "boolean", "The partly-checked look. Announced as mixed."],
					["size", '"sm" | "md" | "lg"', "Default md (20px)."],
					["description", "ReactNode", "A line under the label. Needs children."],
					["children", "ReactNode", "A label. Wraps the box in a label element."],
					["className", "string", "On the label when there are children, otherwise on the box."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>A real checkbox: Space toggles it, forms submit it, and screen readers announce it.</li>
				<li>Keyboard focus shows a 2px ring. Indeterminate is announced as mixed.</li>
				<li>The click target is at least 24px, even for the 16px box.</li>
				<li>
					Reduced motion drops the press, pop and draw and keeps a short fade. Motion off swaps
					states at once.
				</li>
			</ul>
		</Doc>
	);
}
