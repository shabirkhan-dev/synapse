import { Button } from "@rabtx/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	type DialogSize,
} from "@rabtx/ui/dialog";

const sizes: [DialogSize, string][] = [
	["sm", "24rem"],
	["md", "32rem"],
	["lg", "42rem"],
];

export default function DialogSizes() {
	return sizes.map(([size, width]) => (
		<Dialog key={size}>
			<DialogTrigger asChild>
				<Button variant="secondary">{size}</Button>
			</DialogTrigger>
			<DialogContent size={size}>
				<DialogHeader>
					<DialogTitle>Size {size}</DialogTitle>
					<DialogDescription>
						Up to {width} wide, and never wider than the screen less 1rem on each side.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button>Done</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	));
}
