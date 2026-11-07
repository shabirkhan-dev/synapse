import { Button } from "@rabtx/ui/button";
import { Field } from "@rabtx/ui/field";
import { Input } from "@rabtx/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@rabtx/ui/popover";

export default function PopoverDefault() {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="secondary">Dimensions</Button>
			</PopoverTrigger>
			<PopoverContent>
				<PopoverHeader>
					<PopoverTitle>Dimensions</PopoverTitle>
					<PopoverDescription>Set the width and height of the layer.</PopoverDescription>
				</PopoverHeader>
				<div className="grid grid-cols-2 gap-3">
					<Field label="Width">
						<Input size="sm" defaultValue="100%" />
					</Field>
					<Field label="Height">
						<Input size="sm" defaultValue="auto" />
					</Field>
				</div>
			</PopoverContent>
		</Popover>
	);
}
