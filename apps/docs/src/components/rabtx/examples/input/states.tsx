import { Field } from "@rabtx/ui/field";
import { Input } from "@rabtx/ui/input";

export default function InputStates() {
	return (
		<div className="grid w-72 gap-4">
			<Field label="Username" error="That name is taken.">
				<Input defaultValue="ada" />
			</Field>
			<Field label="Backup email" hint="Checked by the browser once you leave the field.">
				<Input type="email" required placeholder="you@example.com" />
			</Field>
			<Field label="Handle" hint="Available.">
				<Input defaultValue="ada-lovelace" success />
			</Field>
			<Input aria-label="Workspace" defaultValue="Locked" disabled />
			<Input aria-label="Invite link" defaultValue="rabtx.dev/join/4f9a" readOnly />
		</div>
	);
}
