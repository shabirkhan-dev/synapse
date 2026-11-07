import { Select } from "@rabtx/ui/select";

export default function SelectNative() {
	return (
		<Select aria-label="Priority" name="priority" defaultValue="medium" className="w-64">
			<option value="low">Low</option>
			<option value="medium">Medium</option>
			<option value="high">High</option>
		</Select>
	);
}
