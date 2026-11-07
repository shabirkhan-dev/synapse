import { Field } from "@rabtx/ui/field";
import { Select, SelectItem } from "@rabtx/ui/select";

export default function SelectDefault() {
	return (
		<Field label="Framework" hint="What the project is built with." className="w-64">
			<Select placeholder="Pick a framework">
				<SelectItem value="next">Next.js</SelectItem>
				<SelectItem value="remix">Remix</SelectItem>
				<SelectItem value="astro">Astro</SelectItem>
				<SelectItem value="vite">Vite</SelectItem>
			</Select>
		</Field>
	);
}
