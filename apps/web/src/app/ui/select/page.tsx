import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import SelectControlled from "./_examples/controlled";
import SelectDefault from "./_examples/default";
import SelectGroups from "./_examples/groups";
import SelectIcons from "./_examples/icons";
import SelectNative from "./_examples/native";
import SelectSizes from "./_examples/sizes";
import SelectStates from "./_examples/states";

export default function SelectPage() {
	return (
		<Doc>
			<h1>Select</h1>
			<p>
				A native select. The list unfolds from the trigger, pulls away into its own rounded panel
				and the rows fade in. Every animation is CSS.
			</p>
			<Example file="select/_examples/default.tsx">
				<SelectDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Select, SelectItem } from "@rabtx/ui/select";\n\n<Select aria-label="Framework" placeholder="Pick a framework" onValueChange={setFramework}>\n\t<SelectItem value="next">Next.js</SelectItem>\n\t<SelectItem value="astro">Astro</SelectItem>\n</Select>`}</pre>
			<p>
				It is a real <code>select</code>, so the browser provides the keyboard, typeahead, form
				value, screen reader support and the picker on phones. In browsers with customizable selects
				the list is drawn and animated to match. In others the system list opens and the trigger
				looks the same.
			</p>

			<h2>Sizes</h2>
			<p>Heights are 32, 40 and 48. Medium is the default.</p>
			<Example file="select/_examples/sizes.tsx">
				<SelectSizes />
			</Example>

			<h2>Icons</h2>
			<p>
				<code>leadingIcon</code> sits before the value. An item&apos;s <code>icon</code> shows in
				the styled list; system lists show the label alone.
			</p>
			<Example file="select/_examples/icons.tsx">
				<SelectIcons />
			</Example>

			<h2>Groups</h2>
			<Example file="select/_examples/groups.tsx">
				<SelectGroups />
			</Example>

			<h2>Error and disabled</h2>
			<p>
				In a Field, <code>error</code> turns the edge red and links the message. Items and the whole
				select can be disabled.
			</p>
			<Example file="select/_examples/states.tsx">
				<SelectStates />
			</Example>

			<h2>Controlled</h2>
			<Example file="select/_examples/controlled.tsx">
				<SelectControlled />
			</Example>

			<h2>Plain options</h2>
			<p>
				<code>SelectItem</code> is an <code>option</code>, so plain options work too.
			</p>
			<Example file="select/_examples/native.tsx">
				<SelectNative />
			</Example>

			<h2>API</h2>
			<p>
				<code>Select</code> takes everything a native select takes, except <code>size</code> and{" "}
				<code>multiple</code>, plus:
			</p>
			<PropsTable
				rows={[
					["size", '"sm" | "md" | "lg"', "Default md."],
					["placeholder", "string", "A hidden first option, shown until a value is chosen."],
					["leadingIcon", "ReactNode", "An icon before the value."],
					["onValueChange", "(value: string) => void", "The new value after every change."],
					["className", "string", "On the wrapper, so width utilities size the control."],
				]}
			/>
			<p>
				<code>SelectItem</code> takes <code>value</code>, <code>disabled</code> and{" "}
				<code>icon</code>. <code>SelectGroup</code> takes a <code>label</code>.{" "}
				<code>SelectSeparator</code> draws a line.
			</p>

			<h2>Accessibility</h2>
			<ul>
				<li>
					A native select: roles, keyboard (arrows, Home, End, typeahead, Escape), announcements and
					form submission come from the browser.
				</li>
				<li>
					Focus shows a blue edge and a soft ring. Give it a label through Field, or an aria-label.
				</li>
				<li>Reduced motion keeps only a short fade. Motion off opens and closes at once.</li>
			</ul>
		</Doc>
	);
}
