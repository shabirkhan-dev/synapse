import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import SliderBubble from "./_examples/bubble";
import SliderControlled from "./_examples/controlled";
import SliderDefault from "./_examples/default";
import SliderForm from "./_examples/form";
import SliderMarks from "./_examples/marks";
import SliderRtl from "./_examples/rtl";
import SliderRuler from "./_examples/ruler";
import SliderSizes from "./_examples/sizes";
import SliderStates from "./_examples/states";
import SliderVertical from "./_examples/vertical";

export default function SliderPage() {
	return (
		<Doc>
			<h1>Slider</h1>
			<p>
				Native range inputs as a slider or a range. The thumb grows on a spring when pressed and a
				bubble follows it with the value. Every animation is CSS.
			</p>
			<Example file="slider/_examples/default.tsx">
				<SliderDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Slider } from "@rabtx/ui/slider";\n\n<Slider aria-label="Volume" defaultValue={[40]} />\n<Slider aria-label="Price" value={range} onValueChange={setRange} />`}</pre>
			<p>
				Values are arrays, as in shadcn: one number is a slider, two a range. Each thumb is an{" "}
				<code>input type=&quot;range&quot;</code>, so arrow keys, Page Up and Down, Home and End,
				forms and screen readers work with no extra code.
			</p>

			<h2>Sizes</h2>
			<p>Tracks are 4, 6 and 8px with 16, 20 and 24px thumbs. Medium is the default.</p>
			<Example file="slider/_examples/sizes.tsx">
				<SliderSizes />
			</Example>

			<h2>Value bubble</h2>
			<p>
				<code>showValue</code> shows the value over the thumb on hover, focus and drag;{" "}
				<code>&quot;always&quot;</code> keeps it out. <code>formatValue</code> formats it and the
				value read to screen readers.
			</p>
			<Example file="slider/_examples/bubble.tsx">
				<SliderBubble />
			</Example>

			<h2>Marks</h2>
			<p>
				<code>marks</code> draws ticks under the track, for every step or for a list of values with
				optional labels. They also fill the input&apos;s datalist.
			</p>
			<Example file="slider/_examples/marks.tsx">
				<SliderMarks />
			</Example>

			<h2>Ruler</h2>
			<p>A needle over a tick scale, with a large readout above.</p>
			<Example file="slider/_examples/ruler.tsx">
				<SliderRuler />
			</Example>

			<h2>Vertical</h2>
			<Example file="slider/_examples/vertical.tsx">
				<SliderVertical />
			</Example>

			<h2>States</h2>
			<p>
				Disabled is dimmed and skipped by Tab. In a <code>Field</code>, an error turns the rail edge
				and the thumb red and links the message.
			</p>
			<Example file="slider/_examples/states.tsx">
				<SliderStates />
			</Example>

			<h2>Controlled</h2>
			<p>
				<code>onValueChange</code> fires on every move, <code>onValueCommit</code> when a drag or a
				key press ends. <code>minStepsBetweenThumbs</code> keeps the thumbs apart.
			</p>
			<Example file="slider/_examples/controlled.tsx">
				<SliderControlled />
			</Example>

			<h2>Forms</h2>
			<p>A range submits one entry per thumb under its name.</p>
			<Example file="slider/_examples/form.tsx">
				<SliderForm />
			</Example>

			<h2>Right to left</h2>
			<Example file="slider/_examples/rtl.tsx">
				<SliderRtl />
			</Example>

			<h2>API</h2>
			<p>Everything a div takes, plus:</p>
			<PropsTable
				rows={[
					["value / defaultValue", "number[]", "One value per thumb. Defaults to [min]."],
					["onValueChange", "(value: number[]) => void", "Every move."],
					["onValueCommit", "(value: number[]) => void", "When a drag or a key press ends."],
					["min / max / step", "number", "0, 100 and 1 by default."],
					["minStepsBetweenThumbs", "number", "Steps kept between thumbs. Defaults to 0."],
					["orientation", '"horizontal" | "vertical"', "Vertical needs a height."],
					["size", '"sm" | "md" | "lg"', 'Defaults to "md".'],
					["variant", '"default" | "ruler"', "The ruler is a needle over a tick scale."],
					["showValue", 'boolean | "always"', "A value bubble over each thumb."],
					["formatValue", "(value: number) => string", "Bubble, readout, marks, aria-valuetext."],
					["marks", "boolean | (number | { value, label })[]", "Ticks under the track."],
					["thumbLabels", "string[]", 'Thumb names in a range. "Minimum", "Maximum".'],
					["name / form / disabled", "", "As on a native input; a range submits one per thumb."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					Each thumb is a native slider: its role, value, minimum and maximum come from the input.
				</li>
				<li>
					Range thumbs are named by the label and their own name (&quot;Price Minimum&quot;) and are
					clamped so they never cross.
				</li>
				<li>Keyboard focus shows a 2px ring around the thumb.</li>
				<li>
					Reduced motion and <code>data-motion=&quot;off&quot;</code> keep every state but move
					nothing.
				</li>
			</ul>
		</Doc>
	);
}
