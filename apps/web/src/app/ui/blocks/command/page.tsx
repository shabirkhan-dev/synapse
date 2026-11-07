import { Doc } from "../../_components/doc";
import { Example } from "../../_components/example";
import { PropsTable } from "../../_components/props-table";
import CommandInlineExample from "./_examples/inline";
import CommandPaletteExample from "./_examples/palette";
import CommandSearchExample from "./_examples/search";

export default function CommandBlockPage() {
	return (
		<Doc>
			<h1>Command palette block</h1>
			<p>
				A ⌘K palette made of Rabtx components: a native Dialog, the Input as a combobox, Badges,
				Buttons and Tabs. Fuzzy search over grouped commands, recent items, nested pages, loading
				and empty states. The highlight slides by CSS anchor positioning and the list eases to its
				height. Press <kbd>⌘K</kbd> or <kbd>Ctrl K</kbd>.
			</p>
			<Example file="blocks/command/_examples/palette.tsx" muted>
				<CommandPaletteExample />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { CommandBlock } from "@rabtx/ui/blocks/command";\n\n<CommandBlock\n\tcommands={[\n\t\t{ id: "home", label: "Go to Home", group: "Navigation", onSelect: () => router.push("/") },\n\t\t{ id: "theme", label: "Change theme", items: [\n\t\t\t{ id: "dark", label: "Dark", onSelect: () => setTheme("dark") },\n\t\t] },\n\t\t{ id: "team", label: "Switch team", items: () => fetchTeams() },\n\t]}\n/>`}</pre>
			<p>
				A command runs its <code>onSelect</code> and closes the palette. One with <code>items</code>{" "}
				opens a page instead (Backspace or Escape goes back); a function there loads the page while
				the list shows its loading state.
			</p>

			<h2>Inline, with scopes</h2>
			<p>
				<code>CommandPanel</code> is the same list without the dialog. <code>scopes</code> adds Tabs
				that narrow it to one group.
			</p>
			<Example file="blocks/command/_examples/inline.tsx" muted>
				<CommandInlineExample />
			</Example>

			<h2>Your own search</h2>
			<p>
				<code>filter=&#123;false&#125;</code> lists your results as given; <code>loading</code>{" "}
				shows skeleton rows, then a spinner while results are on screen.
			</p>
			<Example file="blocks/command/_examples/search.tsx" muted>
				<CommandSearchExample />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					[
						"commands",
						"CommandItem[]",
						"id, label, group, icon, shortcut, badge, items, onSelect…",
					],
					["onSelect", "(item, parents) => void", "After the command's own onSelect."],
					["shortcut", "string | false", 'With ⌘ or Ctrl. Default "k".'],
					["open, onOpenChange", "boolean, (open) => void", "Control the dialog."],
					["recent, onRecentChange", "string[]", "Recent ids, newest first. recentLimit 5."],
					["loading, filter", "boolean", "Your own search: show loading, keep the order."],
					["empty", "ReactNode | (query) => ReactNode", "When nothing matches."],
					["scopes", "boolean", "Tabs for the page's groups."],
					["trigger", "ReactElement | false", "Your own button, or none."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					The field is a <code>combobox</code> controlling a <code>listbox</code>; focus stays in it
					and <code>aria-activedescendant</code> names the active option.
				</li>
				<li>Arrows (wrapping), Home, End and Enter; disabled options are skipped.</li>
				<li>Groups are named by their headings; a polite live region counts the results.</li>
				<li>
					The dialog is native: the page is inert, Escape closes it and focus returns to the
					trigger.
				</li>
				<li>Reduced motion and Motion off stop the highlight and the height from moving.</li>
			</ul>
		</Doc>
	);
}
