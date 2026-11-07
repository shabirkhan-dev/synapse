import { Doc } from "../../_components/doc";
import { Example } from "../../_components/example";
import { PropsTable } from "../../_components/props-table";
import SettingsBlockCompact from "./_examples/compact";
import SettingsBlockExample from "./_examples/settings";

export default function SettingsBlockPage() {
	return (
		<Doc>
			<h1>Settings block</h1>
			<p>
				A settings page in five sections, made only of Rabtx components: Tabs, Cards, Field, Input,
				Textarea, Select, Switch, Checkbox, RadioGroup, Dialog, Badge and StatefulButton. One native
				form with the browser&apos;s constraints, a sticky bar for unsaved changes and two dialogs.
				Nothing is sent; wire the callbacks to your API.
			</p>
			<Example file="blocks/settings/_examples/settings.tsx" muted>
				<SettingsBlockExample />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { SettingsBlock } from "@rabtx/ui/blocks/settings";\n\n<SettingsBlock\n\temail={user.email}\n\tplan="Pro"\n\tdefaultValues={user.settings}\n\tonSave={async (values, { changed }) => { /* return field errors, or throw */ }}\n\tonChangeEmail={async (email) => { /* return a message to reject it */ }}\n\tonDeleteAccount={async () => { /* delete, then sign out */ }}\n/>`}</pre>
			<p>
				Change anything and the bar slides in; <code>Ctrl+S</code> or <code>⌘S</code> saves.
				&quot;admin&quot; as the username fails on the server and opens Profile; taken@example.com
				is refused by Change email.
			</p>

			<h2>Narrow</h2>
			<p>
				The layout follows the block&apos;s own width through a container query: in a narrow column
				the sections are a row of tabs that scrolls sideways.
			</p>
			<Example file="blocks/settings/_examples/compact.tsx" muted>
				<SettingsBlockCompact />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					["onSave", "(values, { changed }) => SettingsErrors | void", "Return errors, or throw."],
					["onChangeEmail", "(email) => string | void", "Return a message to reject it."],
					["onDeleteAccount", "() => string | void", "Return a message to refuse."],
					["defaultValues", "Partial<SettingsValues>", "The saved settings."],
					["email, plan", "string", "The sign-in email and the plan's Badge."],
					["languages, timezones", "{ value, label }[]", "The two Selects' options."],
					["section, defaultSection", "SettingsSection", "The open section."],
					["deletePhrase", "string", 'What to type to delete. Default "delete my account".'],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					WAI-ARIA tabs whose arrow keys follow the layout: up and down beside, left and right on
					top.
				</li>
				<li>
					Save opens the section of the first error and focuses the field; its tab gets a dot.
				</li>
				<li>A polite live region announces unsaved changes, saving and discarding.</li>
				<li>The dialogs are native, named by their titles; Delete takes a typed phrase.</li>
				<li>Reduced motion and Motion off stop the slides; every state still shows.</li>
			</ul>
		</Doc>
	);
}
