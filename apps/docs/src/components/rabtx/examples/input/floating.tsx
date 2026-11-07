import { Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@rabtx/ui/input";

export default function InputFloating() {
	return (
		<div className="grid w-72 gap-3">
			<Input label="Full name" size="lg" autoComplete="name" />
			<Input
				label="Email"
				size="lg"
				type="email"
				placeholder="you@example.com"
				leadingIcon={<HugeiconsIcon icon={Mail01Icon} />}
			/>
			<Input label="Company" defaultValue="Acme" />
		</div>
	);
}
