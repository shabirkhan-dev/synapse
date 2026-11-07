import { Button } from "@rabtx/ui/button";
import { Popover, PopoverContent, type PopoverSide, PopoverTrigger } from "@rabtx/ui/popover";

const sides: PopoverSide[] = ["top", "right", "bottom", "left"];

export default function PopoverSides() {
	return (
		<div className="flex flex-wrap justify-center gap-2">
			{sides.map((side) => (
				<Popover key={side}>
					<PopoverTrigger asChild>
						<Button variant="outline" size="sm" className="capitalize">
							{side}
						</Button>
					</PopoverTrigger>
					<PopoverContent side={side} className="w-auto max-w-56">
						Opens on the {side}, and flips to the other side when it would not fit.
					</PopoverContent>
				</Popover>
			))}
		</div>
	);
}
