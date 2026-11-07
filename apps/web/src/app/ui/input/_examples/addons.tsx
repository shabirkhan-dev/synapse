import { Input } from "@rabtx/ui/input";

export default function InputAddons() {
	return (
		<div className="grid w-72 gap-3">
			<Input aria-label="Website" placeholder="acme" startAddon="https://" endAddon=".com" />
			<Input
				aria-label="Price"
				type="number"
				inputMode="decimal"
				placeholder="0.00"
				leadingIcon={<span className="text-sm">$</span>}
				endAddon="USD"
			/>
		</div>
	);
}
