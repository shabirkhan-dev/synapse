import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import InputAddons from "./_examples/addons";
import InputAlignment from "./_examples/alignment";
import InputDefault from "./_examples/default";
import InputFloating from "./_examples/floating";
import InputIcons from "./_examples/icons";
import InputOtp from "./_examples/otp";
import InputPassword from "./_examples/password";
import InputSearch from "./_examples/search";
import InputSizes from "./_examples/sizes";
import InputStates from "./_examples/states";
import InputVariants from "./_examples/variants";

export default function InputPage() {
	return (
		<Doc>
			<h1>Input</h1>
			<p>
				A native text input drawn like the Select trigger, with icons, addons, a floating label,
				clear and password buttons, and a one-time code. Every animation is CSS.
			</p>
			<Example file="input/_examples/default.tsx">
				<InputDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Field } from "@rabtx/ui/field";\nimport { Input } from "@rabtx/ui/input";\n\n<Field label="Email">\n\t<Input type="email" placeholder="you@example.com" />\n</Field>`}</pre>
			<p>
				Give every input a visible label (a <code>Field</code> or the floating <code>label</code>)
				or an <code>aria-label</code>. A placeholder is not a label.
			</p>

			<h2>Sizes</h2>
			<p>
				Heights are 32, 40 and 48, the same as the Button and the Select. Medium is the default.
			</p>
			<Example file="input/_examples/sizes.tsx">
				<InputSizes />
			</Example>

			<h2>With a Select and a Button</h2>
			<p>Same height, edge, fill and corners as the Select trigger, so a row lines up.</p>
			<Example file="input/_examples/alignment.tsx">
				<InputAlignment />
			</Example>

			<h2>Variants</h2>
			<p>
				<code>outline</code> (default) matches the Select. <code>filled</code> is the recessed
				field, which goes to one border in Flat.
			</p>
			<Example file="input/_examples/variants.tsx">
				<InputVariants />
			</Example>

			<h2>Icons and shape</h2>
			<p>
				<code>leadingIcon</code> and <code>trailingIcon</code> are decorative HugeIcons.{" "}
				<code>pill</code> makes the field fully round.
			</p>
			<Example file="input/_examples/icons.tsx">
				<InputIcons />
			</Example>

			<h2>Addons</h2>
			<Example file="input/_examples/addons.tsx">
				<InputAddons />
			</Example>

			<h2>Search and clear</h2>
			<p>
				<code>clearable</code> shows a clear button only while there is text. It empties the input
				the way typing would, so controlled inputs get their <code>onChange</code>.
			</p>
			<Example file="input/_examples/search.tsx">
				<InputSearch />
			</Example>

			<h2>Password</h2>
			<p>The eye shows and hides the password; its pressed state is announced.</p>
			<Example file="input/_examples/password.tsx">
				<InputPassword />
			</Example>

			<h2>Floating label</h2>
			<p>
				The label rests where the text goes and floats to the top edge, smaller, on focus or once
				filled. Use md or lg.
			</p>
			<Example file="input/_examples/floating.tsx">
				<InputFloating />
			</Example>

			<h2>States</h2>
			<p>
				An error from a Field, or a native constraint that fails after editing (
				<code>:user-invalid</code>), turns the edge red and shakes it once. <code>success</code>{" "}
				draws a tick. Disabled fades; read-only tints the fill.
			</p>
			<Example file="input/_examples/states.tsx">
				<InputStates />
			</Example>

			<h2>One-time code</h2>
			<p>
				<code>InputOTP</code> is one real input shown as slots, so paste and SMS autofill work. The
				ring glides to the next slot and each character rolls in.
			</p>
			<Example file="input/_examples/otp.tsx">
				<InputOtp />
			</Example>

			<h2>API</h2>
			<p>
				<code>Input</code> takes everything a native input takes, except the numeric{" "}
				<code>size</code>, plus:
			</p>
			<PropsTable
				rows={[
					["size", '"sm" | "md" | "lg"', "Default md: 32, 40 or 48."],
					["variant", '"outline" | "filled"', "Default outline."],
					["pill", "boolean", "Fully round."],
					["leadingIcon / trailingIcon", "ReactNode", "Decorative icons, hidden from readers."],
					["startAddon / endAddon", "ReactNode", "Segments at either end."],
					["label", "ReactNode", "A floating label. Use instead of a Field label."],
					["clearable / onClear / clearLabel", "boolean / () => void / string", "A clear button."],
					["success", "boolean", "A green tick that draws in."],
					["action", "ReactNode", "Your own trailing button (class inputParts.action)."],
					["className", "string", "On the wrapper, so width utilities size the control."],
				]}
			/>
			<p>
				<code>PasswordInput</code> takes the same props plus <code>revealLabel</code>.{" "}
				<code>InputOTP</code> takes <code>length</code>, <code>size</code>, <code>charset</code>,{" "}
				<code>mask</code>, <code>value</code>, <code>defaultValue</code>, <code>onValueChange</code>{" "}
				and <code>onComplete</code>.
			</p>

			<h2>Accessibility</h2>
			<ul>
				<li>A real input, so type, autocomplete, validation and phone keyboards just work.</li>
				<li>Clicking the padding or an icon focuses the input. Tab order is unchanged.</li>
				<li>Focus shows a blue edge and a soft ring; an error a red edge and ring.</li>
				<li>Reduced motion and Motion off keep every state without the shake, float or glide.</li>
			</ul>
		</Doc>
	);
}
