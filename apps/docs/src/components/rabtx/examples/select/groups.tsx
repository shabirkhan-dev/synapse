import { Select, SelectGroup, SelectItem, SelectSeparator } from "@rabtx/ui/select";

export default function SelectGroups() {
	return (
		<Select aria-label="Time zone" defaultValue="pkt" className="w-64">
			<SelectGroup label="Asia">
				<SelectItem value="pkt">Karachi (UTC+5)</SelectItem>
				<SelectItem value="ist">Kolkata (UTC+5:30)</SelectItem>
				<SelectItem value="gst">Dubai (UTC+4)</SelectItem>
			</SelectGroup>
			<SelectSeparator />
			<SelectGroup label="Europe">
				<SelectItem value="gmt">London (UTC+0)</SelectItem>
				<SelectItem value="cet">Berlin (UTC+1)</SelectItem>
			</SelectGroup>
		</Select>
	);
}
