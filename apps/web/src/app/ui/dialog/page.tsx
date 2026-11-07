import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import DialogDefault from "./_examples/default";
import DialogDestructive from "./_examples/destructive";
import DialogForm from "./_examples/form";
import DialogMorph from "./_examples/morph";
import DialogNested from "./_examples/nested";
import DialogScrollable from "./_examples/scrollable";
import DialogSheet from "./_examples/sheet";
import DialogSizes from "./_examples/sizes";

export default function DialogPage() {
	return (
		<Doc>
			<h1>Dialog</h1>
			<p>
				A native <code>dialog</code> opened with <code>showModal()</code>: the browser gives the top
				layer, the inert page, the focus trap, Escape and the backdrop press. The enter and exit are
				CSS, on the panel spring.
			</p>
			<Example file="dialog/_examples/default.tsx">
				<DialogDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import {\n\tDialog, DialogClose, DialogContent, DialogDescription,\n\tDialogFooter, DialogHeader, DialogTitle, DialogTrigger,\n} from "@rabtx/ui/dialog";\n\n<Dialog>\n\t<DialogTrigger asChild><Button>Open</Button></DialogTrigger>\n\t<DialogContent>\n\t\t<DialogHeader>\n\t\t\t<DialogTitle>Title</DialogTitle>\n\t\t\t<DialogDescription>Description</DialogDescription>\n\t\t</DialogHeader>\n\t\t…\n\t\t<DialogFooter>\n\t\t\t<DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>\n\t\t</DialogFooter>\n\t</DialogContent>\n</Dialog>`}</pre>
			<p>
				The title names the panel and the description describes it, with no ids to pass. Focus goes
				back to the trigger on close.
			</p>

			<h2>Form</h2>
			<p>
				A form inside, with a controlled <code>open</code> so a valid submit closes it.
			</p>
			<Example file="dialog/_examples/form.tsx">
				<DialogForm />
			</Example>

			<h2>Destructive confirm</h2>
			<p>
				No close button and no light dismiss: the two buttons (and Escape) are the only way out. The
				safe action takes the first focus.
			</p>
			<Example file="dialog/_examples/destructive.tsx">
				<DialogDestructive />
			</Example>

			<h2>Sizes</h2>
			<p>Up to 24, 32 or 42rem, never wider than the screen less 1rem a side.</p>
			<Example file="dialog/_examples/sizes.tsx">
				<DialogSizes />
			</Example>

			<h2>Morph</h2>
			<p>
				<code>morph</code> grows the panel out of the trigger with a View Transition and folds it
				back on close. Motion off falls back to the plain dialog.
			</p>
			<Example file="dialog/_examples/morph.tsx">
				<DialogMorph />
			</Example>

			<h2>Sheet</h2>
			<p>
				<code>side=&quot;right&quot;</code> and <code>side=&quot;bottom&quot;</code> slide a sheet
				in from that edge.
			</p>
			<Example file="dialog/_examples/sheet.tsx">
				<DialogSheet />
			</Example>

			<h2>Long content</h2>
			<p>The middle scrolls on its own; the header and the actions stay in view.</p>
			<Example file="dialog/_examples/scrollable.tsx">
				<DialogScrollable />
			</Example>

			<h2>Nested</h2>
			<p>A second dialog stacks on top; Escape closes only the top one.</p>
			<Example file="dialog/_examples/nested.tsx">
				<DialogNested />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					["open", "boolean", "Controlled, with onOpenChange. Or defaultOpen."],
					["onOpenChange", "(open: boolean) => void", "Every change: buttons, Escape, backdrop."],
					["modal", "boolean", "false opens it with show(): no backdrop. Default true."],
					["morph", "boolean", "Grow out of the trigger. Default false."],
				]}
			/>
			<p>
				<code>DialogContent</code> takes everything a <code>dialog</code> takes, plus:
			</p>
			<PropsTable
				rows={[
					["size", '"sm" | "md" | "lg"', "24, 32 or 42rem. Default md."],
					["side", '"center" | "right" | "bottom"', "A centered panel or a sheet. Default center."],
					["showClose", "boolean", "The close button in the corner. Default true."],
					["closeLabel", "string", 'Its accessible name. Default "Close".'],
					["dismissible", "boolean", "Close on a backdrop press. Default true."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					A native modal <code>dialog</code>: the role, the inert page, the focus move and its
					return come from the browser.
				</li>
				<li>
					<code>aria-labelledby</code> and <code>aria-describedby</code> point at the title and the
					description; the trigger has <code>aria-haspopup</code>, <code>aria-expanded</code> and{" "}
					<code>aria-controls</code>.
				</li>
				<li>Reduced motion and Motion off show and hide it at once, with no morph.</li>
			</ul>
		</Doc>
	);
}
