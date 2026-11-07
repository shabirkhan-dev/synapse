import { Field } from "@rabtx/ui/field";
import { PasswordInput } from "@rabtx/ui/input";

export default function InputPassword() {
	return (
		<Field label="Password" hint="At least 12 characters." className="w-72">
			<PasswordInput defaultValue="correct horse" autoComplete="new-password" minLength={12} />
		</Field>
	);
}
