import { Select, SelectItem } from "@rabtx/ui/select";

export default function SelectSizes() {
	return (
		<div className="grid w-64 gap-3">
			{(["sm", "md", "lg"] as const).map((size) => (
				<Select key={size} size={size} aria-label={size} defaultValue="en">
					<SelectItem value="en">English</SelectItem>
					<SelectItem value="fr">Français</SelectItem>
					<SelectItem value="de">Deutsch</SelectItem>
				</Select>
			))}
		</div>
	);
}
