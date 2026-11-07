import { Button } from "@rabtx/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	type TooltipSide,
} from "@rabtx/ui/tooltip";

const sides: { side: TooltipSide; label: string; cell: string }[] = [
	{ side: "top", label: "Top", cell: "col-start-2 row-start-1" },
	{ side: "left", label: "Left", cell: "col-start-1 row-start-2" },
	{ side: "right", label: "Right", cell: "col-start-3 row-start-2" },
	{ side: "bottom", label: "Bottom", cell: "col-start-2 row-start-3" },
];

export default function TooltipSides() {
	return (
		<TooltipProvider>
			<div className="grid grid-cols-3 gap-3">
				{sides.map(({ side, label, cell }) => (
					<Tooltip key={side}>
						<TooltipTrigger asChild>
							<Button variant="outline" size="sm" className={`${cell} w-20`}>
								{label}
							</Button>
						</TooltipTrigger>
						<TooltipContent side={side} arrow>
							On the {side}
						</TooltipContent>
					</Tooltip>
				))}
			</div>
		</TooltipProvider>
	);
}
