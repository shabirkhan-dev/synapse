import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import TabsControlled from "./_examples/controlled";
import TabsDefault from "./_examples/default";
import TabsExpandable from "./_examples/expandable";
import TabsManual from "./_examples/manual";
import TabsOverflow from "./_examples/overflow";
import TabsPill from "./_examples/pill";
import TabsRtl from "./_examples/rtl";
import TabsSizes from "./_examples/sizes";
import TabsStates from "./_examples/states";
import TabsUnderline from "./_examples/underline";
import TabsVariants from "./_examples/variants";
import TabsVertical from "./_examples/vertical";

export default function TabsPage() {
	return (
		<Doc>
			<h1>Tabs</h1>
			<p>
				WAI-ARIA tabs. The highlight slides to the selected tab by CSS anchor positioning on the
				tabs spring, and each panel fades in out of a small blur. Every animation is CSS.
			</p>
			<Example file="tabs/_examples/default.tsx">
				<TabsDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rabtx/ui/tabs";\n\n<Tabs defaultValue="account">\n  <TabsList aria-label="Settings">\n    <TabsTrigger value="account">Account</TabsTrigger>\n    <TabsTrigger value="password">Password</TabsTrigger>\n  </TabsList>\n  <TabsContent value="account">…</TabsContent>\n  <TabsContent value="password">…</TabsContent>\n</Tabs>`}</pre>
			<p>
				Name the list with an <code>aria-label</code>. Panels stay mounted and are{" "}
				<code>hidden</code> while their tab is not selected.
			</p>

			<h2>Variants</h2>
			<p>
				Segmented (the default) is a recessed track with a raised thumb. Pill fills the selected
				tab. Underline draws a line under it. Expandable is a row of icons where the selected tab
				opens to show its label.
			</p>
			<Example file="tabs/_examples/variants.tsx">
				<TabsVariants />
			</Example>

			<h2>Sizes</h2>
			<p>32, 40 and 48px tall, the same as a Button. Medium is the default.</p>
			<Example file="tabs/_examples/sizes.tsx">
				<TabsSizes />
			</Example>

			<h2>Pill</h2>
			<Example file="tabs/_examples/pill.tsx">
				<TabsPill />
			</Example>

			<h2>Underline</h2>
			<Example file="tabs/_examples/underline.tsx">
				<TabsUnderline />
			</Example>

			<h2>Expandable</h2>
			<p>
				The label opens in a grid column that goes from <code>0fr</code> to <code>1fr</code> on the
				swap spring, so the tab grows to its label&apos;s natural width without measuring it. The
				label is always in the accessibility tree, so it names the tab.
			</p>
			<Example file="tabs/_examples/expandable.tsx">
				<TabsExpandable />
			</Example>

			<h2>Vertical</h2>
			<Example file="tabs/_examples/vertical.tsx">
				<TabsVertical />
			</Example>

			<h2>Manual activation</h2>
			<p>The arrow keys move focus without selecting; Enter or Space selects the focused tab.</p>
			<Example file="tabs/_examples/manual.tsx">
				<TabsManual />
			</Example>

			<h2>Disabled</h2>
			<Example file="tabs/_examples/states.tsx">
				<TabsStates />
			</Example>

			<h2>Controlled</h2>
			<Example file="tabs/_examples/controlled.tsx">
				<TabsControlled />
			</Example>

			<h2>Overflow</h2>
			<Example file="tabs/_examples/overflow.tsx">
				<TabsOverflow />
			</Example>

			<h2>Right to left</h2>
			<Example file="tabs/_examples/rtl.tsx">
				<TabsRtl />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					["Tabs value / defaultValue", "string", "Controlled or uncontrolled selected tab."],
					["Tabs onValueChange", "(value: string) => void", "The new value, only when it changes."],
					["Tabs orientation", '"horizontal" | "vertical"', 'Defaults to "horizontal".'],
					[
						"Tabs activationMode",
						'"automatic" | "manual"',
						'"automatic" selects on arrow keys; "manual" waits for Enter or Space.',
					],
					[
						"TabsList variant",
						'"segmented" | "pill" | "underline" | "expandable"',
						'Defaults to "segmented".',
					],
					["TabsList size", '"sm" | "md" | "lg"', '32, 40 or 48px. Defaults to "md".'],
					["TabsTrigger value", "string", "The value it selects."],
					["TabsTrigger icon", "ReactNode", "A decorative icon before the label."],
					["TabsTrigger disabled", "boolean", "Dimmed, skipped by the arrow keys."],
					["TabsContent value", "string", "The tab this panel belongs to."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					<code>tablist</code>, <code>tab</code> and <code>tabpanel</code> roles, with{" "}
					<code>aria-selected</code>, <code>aria-controls</code>, <code>aria-labelledby</code> and{" "}
					<code>aria-orientation</code>.
				</li>
				<li>
					Only the selected tab is in the Tab order. Arrow keys move between tabs and wrap; Home and
					End jump to the ends; disabled tabs are skipped. In right-to-left text the left and right
					arrows swap.
				</li>
				<li>The panel is in the Tab order, so a panel with no controls can still be read.</li>
				<li>
					Reduced motion and <code>data-motion=&quot;off&quot;</code> keep every state but slide
					nothing.
				</li>
			</ul>
		</Doc>
	);
}
