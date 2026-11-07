import { Select, SelectItem } from "@rabtx/ui/select";

/** Near the bottom of the window the list opens above, and unfolds upward from the trigger. */
export default function SelectPlacement() {
	return (
		<Select aria-label="Sort by" defaultValue="recent" className="w-56">
			<SelectItem value="recent">Most recent</SelectItem>
			<SelectItem value="popular">Most popular</SelectItem>
			<SelectItem value="name">Name</SelectItem>
		</Select>
	);
}
