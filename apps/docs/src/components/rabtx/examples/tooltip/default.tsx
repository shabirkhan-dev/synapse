import { Button } from "@rabtx/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@rabtx/ui/tooltip";

export default function TooltipDefault() {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="secondary">Publish</Button>
			</TooltipTrigger>
			<TooltipContent>Make this page public</TooltipContent>
		</Tooltip>
	);
}
