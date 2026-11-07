import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import RadioGroupCards from "./_examples/cards";
import RadioGroupControlled from "./_examples/controlled";
import RadioGroupDefault from "./_examples/default";
import RadioGroupDescription from "./_examples/description";
import RadioGroupHorizontal from "./_examples/horizontal";
import RadioGroupSizes from "./_examples/sizes";
import RadioGroupStates from "./_examples/states";

export default function RadioGroupPage() {
	return (
		<Doc>
			<h1>Radio Group</h1>
			<p>
				Native radios sharing one name inside a radiogroup fieldset. Choosing an option glides the
				dot over from the last choice; a press springs the circle down. Every animation is CSS.
			</p>
			<Example file="radio-group/_examples/default.tsx">
				<RadioGroupDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { RadioGroup, RadioGroupItem } from "@rabtx/ui/radio-group";\n\n<RadioGroup aria-label="Plan" value={plan} onValueChange={setPlan}>\n  <RadioGroupItem value="starter">Starter</RadioGroupItem>\n  <RadioGroupItem value="pro">Pro</RadioGroupItem>\n</RadioGroup>`}</pre>
			<p>
				The browser does the keyboard: the group is one tab stop, the arrow keys move the choice and
				Space chooses. Each option wraps its circle in a <code>label</code>, so the text names it
				and the whole row is clickable. Name the group with <code>aria-label</code> or a{" "}
				<code>Field</code>.
			</p>

			<h2>Sizes</h2>
			<p>Circles are 16, 20 and 24, like the Checkbox. Medium is the default.</p>
			<Example file="radio-group/_examples/sizes.tsx">
				<RadioGroupSizes />
			</Example>

			<h2>Description</h2>
			<p>
				<code>description</code> adds a quieter line under an option. It is announced as the
				description, not as part of the name.
			</p>
			<Example file="radio-group/_examples/description.tsx">
				<RadioGroupDescription />
			</Example>

			<h2>Horizontal</h2>
			<Example file="radio-group/_examples/horizontal.tsx">
				<RadioGroupHorizontal />
			</Example>

			<h2>Choice cards</h2>
			<p>
				<code>variant=&quot;card&quot;</code> draws every option as a card with the circle at the
				end. The chosen card takes a primary edge and tint.
			</p>
			<Example file="radio-group/_examples/cards.tsx">
				<RadioGroupCards />
			</Example>

			<h2>States</h2>
			<p>
				On, off, a disabled group and a Field error, which turns the circles red until something is
				chosen.
			</p>
			<Example file="radio-group/_examples/states.tsx">
				<RadioGroupStates />
			</Example>

			<h2>Controlled</h2>
			<Example file="radio-group/_examples/controlled.tsx">
				<RadioGroupControlled />
			</Example>

			<h2>API</h2>
			<p>RadioGroup takes everything a fieldset takes, plus:</p>
			<PropsTable
				rows={[
					["value", "string", "Controlled value."],
					["defaultValue", "string", "Uncontrolled initial value."],
					["onValueChange", "(value: string) => void", "The new value after every change."],
					["name", "string", "The form field name. Generated when left out."],
					["orientation", '"vertical" | "horizontal"', "Default vertical."],
					["size", '"sm" | "md" | "lg"', "Default md (20px)."],
					["variant", '"default" | "card"', "Card draws choice cards."],
					["disabled", "boolean", "Disables every option."],
					["required", "boolean", "One option must be chosen to submit."],
				]}
			/>
			<p>RadioGroupItem takes everything a native radio takes, plus:</p>
			<PropsTable
				rows={[
					["value", "string", "The group's value when chosen. Required."],
					["description", "ReactNode", "A line under the label."],
					["children", "ReactNode", "The label."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>Real radios: one tab stop, arrow keys, Space, form submission and announcements.</li>
				<li>Keyboard focus shows a 2px ring on the circle, or on the card.</li>
				<li>The click target is at least 24px, even for the 16px circle.</li>
				<li>Reduced motion drops the press and the glide and keeps a short fade.</li>
			</ul>
		</Doc>
	);
}
