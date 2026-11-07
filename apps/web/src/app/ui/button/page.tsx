import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import ButtonDisabled from "./_examples/disabled";
import ButtonIcons from "./_examples/icons";
import ButtonLinkExample from "./_examples/link";
import ButtonMagnetic from "./_examples/magnetic";
import ButtonMetallic from "./_examples/metallic";
import ButtonRipple from "./_examples/ripple";
import ButtonSizes from "./_examples/sizes";
import ButtonStates from "./_examples/states";
import ButtonVariants from "./_examples/variants";

export default function ButtonPage() {
	return (
		<Doc>
			<h1>Button</h1>
			<p>
				A native button with four styles and four sizes. It grows a touch under a mouse and springs
				down when pressed. Every animation is CSS.
			</p>
			<Example file="button/_examples/variants.tsx">
				<ButtonVariants />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Button } from "@rabtx/ui/button";\n\n<Button variant="secondary">Cancel</Button>`}</pre>

			<h2>Sizes</h2>
			<p>
				Heights are 32, 40 and 48, all pill shaped. Medium is the default. Icon is a 32px square.
			</p>
			<Example file="button/_examples/sizes.tsx">
				<ButtonSizes />
			</Example>

			<h2>Icons</h2>
			<p>
				Put HugeIcons in the children, before or after the text. They are sized for you. An
				icon-only button uses <code>size="icon"</code> and requires an <code>aria-label</code>.
			</p>
			<Example file="button/_examples/icons.tsx">
				<ButtonIcons />
			</Example>

			<h2>States</h2>
			<p>
				<code>StatefulButton</code> moves between idle, loading, success and error. The status icon
				widens in, the label rolls over letter by letter and the button eases to its new width.
				Click to try it.
			</p>
			<Example file="button/_examples/states.tsx">
				<ButtonStates />
			</Example>

			<h2>Disabled</h2>
			<Example file="button/_examples/disabled.tsx">
				<ButtonDisabled />
			</Example>

			<h2>Ripple</h2>
			<p>
				<code>ripple</code> spreads a soft disc from where you pressed. <code>pressScale</code> sets
				how far the press goes.
			</p>
			<Example file="button/_examples/ripple.tsx">
				<ButtonRipple />
			</Example>

			<h2>Link</h2>
			<p>
				<code>ButtonLink</code> is an <code>a</code> that looks like a button, for navigation.
			</p>
			<Example file="button/_examples/link.tsx">
				<ButtonLinkExample />
			</Example>

			<h2>Magnetic</h2>
			<p>Leans toward a mouse pointer and springs back when it leaves. Touch never moves it.</p>
			<Example file="button/_examples/magnetic.tsx">
				<ButtonMagnetic />
			</Example>

			<h2>Metallic</h2>
			<p>A polished chrome rim that drifts slowly. Hover sweeps a highlight across it.</p>
			<Example file="button/_examples/metallic.tsx">
				<ButtonMetallic />
			</Example>

			<h2>API</h2>
			<p>Everything a native button takes, plus:</p>
			<PropsTable
				rows={[
					["variant", '"primary" | "secondary" | "ghost" | "outline"', "Default primary."],
					["size", '"sm" | "md" | "lg" | "icon"', "Default md. Icon needs aria-label."],
					["pressScale", "number", "Scale while pressed. Default 0.93, 1 turns it off."],
					["ripple", "boolean", "A disc spreads from the press."],
				]}
			/>
			<p>
				<code>StatefulButton</code> adds:
			</p>
			<PropsTable
				rows={[
					["state", '"idle" | "loading" | "success" | "error"', "Default idle."],
					["loadingText", "ReactNode", 'Default "Loading".'],
					["successText", "ReactNode", 'Default "Done".'],
					["errorText", "ReactNode", 'Default "Try again".'],
					["icon", "ReactNode", "After the idle label; folds away in other states."],
				]}
			/>
			<p>
				<code>MagneticButton</code> adds <code>strength</code> (0 to 1, default 0.25).{" "}
				<code>MetallicButton</code> adds <code>paused</code>.
			</p>

			<h2>Theming</h2>
			<p>
				The Button reads only the theme tokens in <code>theme.css</code>: <code>--primary</code>,{" "}
				<code>--secondary</code>, <code>--accent</code>, <code>--input</code>, <code>--ring</code>{" "}
				and <code>--radius-button</code>. Set one on any ancestor to restyle the buttons inside, or
				pass Tailwind classes, which win over the component styles.
			</p>

			<h2>Accessibility</h2>
			<ul>
				<li>
					A real <code>button</code> with <code>type="button"</code> by default.
				</li>
				<li>Keyboard focus shows a 2px ring. Mouse clicks do not.</li>
				<li>
					Loading sets <code>aria-busy</code>, blocks clicks and stays focusable. Label changes are
					announced politely, as whole words.
				</li>
				<li>Hover only applies where a real hover exists.</li>
				<li>
					With reduced motion, labels cross-fade and nothing travels. With motion off, states swap
					at once.
				</li>
			</ul>
		</Doc>
	);
}
