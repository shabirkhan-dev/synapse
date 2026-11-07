import { Input, inputSizes } from "@rabtx/ui/input";

export default function InputSizes() {
	return (
		<div className="grid w-72 gap-3">
			{inputSizes.map((size) => (
				<Input key={size} size={size} placeholder={`Size ${size}`} aria-label={size} />
			))}
		</div>
	);
}
