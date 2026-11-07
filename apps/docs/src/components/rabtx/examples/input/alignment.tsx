import { Button } from "@rabtx/ui/button";
import { Input, inputSizes } from "@rabtx/ui/input";
import { Select, SelectItem } from "@rabtx/ui/select";

export default function InputAlignment() {
	return (
		<div className="grid w-full max-w-xl gap-3">
			{inputSizes.map((size) => (
				<div key={size} className="flex items-center gap-2" data-row={size}>
					<Input size={size} placeholder="Invite by email" aria-label={`Email, ${size}`} />
					<Select
						size={size}
						aria-label={`Role, ${size}`}
						defaultValue="member"
						className="w-32 shrink-0"
					>
						<SelectItem value="member">Member</SelectItem>
						<SelectItem value="admin">Admin</SelectItem>
					</Select>
					<Button size={size}>Invite</Button>
				</div>
			))}
		</div>
	);
}
