import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import CardDefault from "./_examples/default";
import CardExpandable from "./_examples/expandable";
import CardLink from "./_examples/link";
import CardMedia from "./_examples/media";
import CardSelectable from "./_examples/selectable";
import CardSizes from "./_examples/sizes";
import CardSpotlight from "./_examples/spotlight";
import CardStackExample from "./_examples/stack";
import CardTilt from "./_examples/tilt";

export default function CardPage() {
	return (
		<Doc>
			<h1>Card</h1>
			<p>
				A surface for one subject, in shadcn&apos;s parts. Links, selection, tilt, spotlight,
				expanding and stacking are all CSS on top of the same surface.
			</p>
			<Example file="card/_examples/default.tsx" muted>
				<CardDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import {\n\tCard, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,\n} from "@rabtx/ui/card";\n\n<Card>\n\t<CardHeader>\n\t\t<CardTitle as="h3">Title</CardTitle>\n\t\t<CardDescription>Description</CardDescription>\n\t\t<CardAction>…</CardAction>\n\t</CardHeader>\n\t<CardContent>…</CardContent>\n\t<CardFooter>…</CardFooter>\n</Card>`}</pre>
			<p>
				Each part pads itself, so leave out any of them. <code>CardAction</code> pins to the top
				right of the header and drops under the title when the header is narrower than 15rem (a
				container query). Depth and radius come from the page modes.
			</p>

			<h2>Sizes</h2>
			<p>Padding is 12, 16 or 20 pixels, including the 1px edge.</p>
			<Example file="card/_examples/sizes.tsx" muted>
				<CardSizes />
			</Example>

			<h2>Media</h2>
			<p>
				An image, video or <code>data-slot=&quot;card-media&quot;</code> placed directly in the card
				runs edge to edge and takes the card&apos;s corners.
			</p>
			<Example file="card/_examples/media.tsx" muted>
				<CardMedia />
			</Example>

			<h2>Link card</h2>
			<p>
				Put <code>cardParts.target</code> on the one link or button that owns the card. Its hit area
				covers the card, the card answers hover, press and keyboard focus, and other buttons stay on
				top. The card itself never takes focus.
			</p>
			<Example file="card/_examples/link.tsx" muted>
				<CardLink />
			</Example>

			<h2>Selectable</h2>
			<p>
				A label target with a radio or checkbox: the checked input marks the card selected with a
				primary edge, through <code>:has()</code>. A disabled input dims the card.
			</p>
			<Example file="card/_examples/selectable.tsx" muted>
				<CardSelectable />
			</Example>

			<h2>Tilt</h2>
			<p>
				<code>TiltCard</code> leans toward a mouse in 3D, with a glare under the pointer, and
				springs back flat. Touch, reduced motion and Motion off keep it flat.
			</p>
			<Example file="card/_examples/tilt.tsx" muted>
				<CardTilt />
			</Example>

			<h2>Spotlight</h2>
			<p>
				<code>SpotlightCard</code> carries a soft light and a lit edge after the pointer, in{" "}
				<code>--primary</code>. Keyboard focus inside lights it from the top.
			</p>
			<Example file="card/_examples/spotlight.tsx" muted>
				<CardSpotlight />
			</Example>

			<h2>Expandable</h2>
			<p>
				<code>ExpandableCard</code> is a <code>details</code> element. Its content grows to its
				height on the panel spring; a shared <code>name</code> keeps one open at a time.
			</p>
			<Example file="card/_examples/expandable.tsx" muted>
				<CardExpandable />
			</Example>

			<h2>Stack</h2>
			<p>
				<code>CardStack</code> piles cards behind the first and spreads them into a list. Click the
				pile or the button.
			</p>
			<Example file="card/_examples/stack.tsx" muted>
				<CardStackExample />
			</Example>

			<h2>API</h2>
			<p>Every part takes everything its native element takes. Card adds:</p>
			<PropsTable
				rows={[
					["size", '"sm" | "default" | "lg"', "12, 16 or 20px padding. Default default."],
					["as", '"div" | "article" | "section" | "aside" | "li"', "The element. Default div."],
				]}
			/>
			<p>
				<code>CardTitle</code> takes <code>as</code> (a heading level or div);{" "}
				<code>CardHeader</code> and <code>CardFooter</code> can render <code>header</code> and{" "}
				<code>footer</code> inside an article or section card.
			</p>
			<PropsTable
				rows={[
					["TiltCard max", "number", "Degrees at a corner. Default 10."],
					["TiltCard glare", "boolean", "The highlight under the pointer. Default true."],
					["ExpandableCard title", "ReactNode", "The summary heading and the toggle's name."],
					["ExpandableCard description", "ReactNode", "A line under the title."],
					["ExpandableCard open", "boolean", "Controlled; with onOpenChange. Or defaultOpen."],
					["CardStack noun", "string", 'For the toggle, "Show all 4 notifications".'],
					["CardStack peek", "number", "Cards peeking behind the first. Default 2."],
					["CardStack expanded", "boolean", "Controlled; with onExpandedChange."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					A card adds no role and no tab stop. Use <code>as</code> for an article or a labelled
					section, and <code>CardTitle as</code> for the heading level.
				</li>
				<li>
					A clickable card is a real link, button or label inside it, so the name, role and keyboard
					come from that element.
				</li>
				<li>
					The expandable card is native <code>details</code>; the stack&apos;s toggle is a button
					with <code>aria-expanded</code>, and the cards behind are <code>inert</code> while
					collapsed.
				</li>
				<li>
					Tilt and spotlight are decoration and ignore touch. Reduced motion and Motion off keep the
					card flat and drop the fades.
				</li>
			</ul>
		</Doc>
	);
}
