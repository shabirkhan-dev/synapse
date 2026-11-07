import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import DropdownMenuActions from "./_examples/actions";
import DropdownMenuCheckboxes from "./_examples/checkboxes";
import ContextMenuExample from "./_examples/context-menu";
import DropdownMenuDefault from "./_examples/default";
import DropdownMenuRadio from "./_examples/radio";

export default function DropdownMenuPage() {
	return (
		<Doc>
			<h1>Dropdown Menu</h1>
			<p>
				WAI-ARIA&apos;s menu button on the native Popover API: arrow keys, Home and End, typeahead,
				Escape back to the button. A highlight glides between rows by CSS anchor positioning, and
				the menu unfolds from its trigger.
			</p>
			<Example file="dropdown-menu/_examples/default.tsx">
				<DropdownMenuDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import {\n\tDropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,\n} from "@rabtx/ui/dropdown-menu";\n\n<DropdownMenu>\n\t<DropdownMenuTrigger asChild><Button>Open</Button></DropdownMenuTrigger>\n\t<DropdownMenuContent>\n\t\t<DropdownMenuItem icon={<Icon />} shortcut="⌘C" onSelect={copy}>Copy</DropdownMenuItem>\n\t</DropdownMenuContent>\n</DropdownMenu>`}</pre>

			<h2>Icons, shortcuts and a destructive action</h2>
			<p>
				<code>icon</code>, <code>shortcut</code>, <code>variant=&quot;destructive&quot;</code> and{" "}
				<code>disabled</code> on a row; <code>align=&quot;end&quot;</code> on the content.
			</p>
			<Example file="dropdown-menu/_examples/actions.tsx">
				<DropdownMenuActions />
			</Example>

			<h2>Checkboxes</h2>
			<p>
				<code>DropdownMenuCheckboxItem</code> draws its tick in. Prevent the select event to keep
				the menu open while toggling.
			</p>
			<Example file="dropdown-menu/_examples/checkboxes.tsx">
				<DropdownMenuCheckboxes />
			</Example>

			<h2>Radio group</h2>
			<Example file="dropdown-menu/_examples/radio.tsx">
				<DropdownMenuRadio />
			</Example>

			<h2>Context menu</h2>
			<p>
				<code>ContextMenu</code> opens the same menu at the pointer on a right-click, or under the
				focused element with the menu key or Shift+F10.
			</p>
			<Example file="dropdown-menu/_examples/context-menu.tsx">
				<ContextMenuExample />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					["open", "boolean", "Controlled, with onOpenChange. Or defaultOpen."],
					["onOpenChange", "(open: boolean) => void", "Every change."],
				]}
			/>
			<p>
				<code>DropdownMenuContent</code>:
			</p>
			<PropsTable
				rows={[
					["side", '"top" | "right" | "bottom" | "left"', "Default bottom. Flips to fit."],
					["align", '"start" | "center" | "end"', "Default start."],
					["sideOffset", "number", "Gap to the trigger in px. Default 8."],
				]}
			/>
			<p>
				<code>DropdownMenuItem</code>:
			</p>
			<PropsTable
				rows={[
					["onSelect", "(event: Event) => void", "preventDefault() keeps the menu open."],
					["icon", "ReactNode", "An icon before the label."],
					["shortcut", "ReactNode", "A hint at the end of the row."],
					["variant", '"default" | "destructive"', "Destructive draws it in red."],
					["disabled", "boolean", "Skipped by the keys, not chosen."],
					["inset", "boolean", "Indent to line up with ticked rows."],
					["textValue", "string", "What typeahead matches, for rich labels."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					<code>role=&quot;menu&quot;</code> with <code>menuitem</code>,{" "}
					<code>menuitemcheckbox</code> and <code>menuitemradio</code> rows, labelled by the
					trigger; groups are named by their label.
				</li>
				<li>
					Enter, Space and ArrowDown open it on the first row, ArrowUp on the last. Arrows wrap,
					Home and End jump, letters jump by typeahead, ArrowRight and ArrowLeft open and close a
					submenu, Escape closes one level and Tab closes the menu.
				</li>
				<li>Focus goes back to the trigger when the menu closes.</li>
			</ul>
		</Doc>
	);
}
