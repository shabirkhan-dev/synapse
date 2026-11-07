import { Mail01Icon, Search01Icon, SquareLock02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@rabtx/ui/input";

export default function InputIcons() {
	return (
		<div className="grid w-72 gap-3">
			<Input
				type="email"
				placeholder="you@example.com"
				aria-label="Work email"
				leadingIcon={<HugeiconsIcon icon={Mail01Icon} />}
			/>
			<Input
				defaultValue="acme-prod"
				aria-label="Project"
				trailingIcon={<HugeiconsIcon icon={SquareLock02Icon} />}
			/>
			<Input
				pill
				type="search"
				placeholder="Search"
				aria-label="Search"
				leadingIcon={<HugeiconsIcon icon={Search01Icon} />}
			/>
		</div>
	);
}
