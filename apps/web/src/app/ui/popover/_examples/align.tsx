import { Button } from "@rabtx/ui/button";
import { Popover, type PopoverAlign, PopoverContent, PopoverTrigger } from "@rabtx/ui/popover";

const aligns: PopoverAlign[] = ["start", "center", "end"];

export default function PopoverAlignExample() {
	return (
		<div className="flex flex-wrap justify-center gap-2">
			{aligns.map((align) => (
				<Popover key={align}>
					<PopoverTrigger asChild>
						<Button variant="outline" className="w-36 capitalize">
							{align}
						</Button>
					</PopoverTrigger>
					<PopoverContent align={align} className="w-60">
						Lined up with the trigger&apos;s {align === "center" ? "center" : `${align} edge`}. It
						unfolds from that corner.
					</PopoverContent>
				</Popover>
			))}
		</div>
	);
}
