import { Input } from "@rabtx/ui/input";

export default function InputVariants() {
	return (
		<div className="grid w-72 gap-3">
			<Input placeholder="Outline, like the Select" aria-label="Outline" />
			<Input variant="filled" placeholder="Filled, recessed" aria-label="Filled" />
		</div>
	);
}
