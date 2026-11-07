import { Button } from "@rabtx/ui/button";
import {
	Tooltip,
	type TooltipAlign,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@rabtx/ui/tooltip";

const aligns: TooltipAlign[] = ["start", "center", "end"];

export default function TooltipAlignment() {
	return (
		<TooltipProvider>
			<div className="flex flex-wrap gap-3">
				{aligns.map((align) => (
					<Tooltip key={align}>
						<TooltipTrigger asChild>
							<Button variant="outline" className="w-28 capitalize">
								{align}
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom" align={align} arrow>
							Aligned to the {align}
						</TooltipContent>
					</Tooltip>
				))}
			</div>
		</TooltipProvider>
	);
}
