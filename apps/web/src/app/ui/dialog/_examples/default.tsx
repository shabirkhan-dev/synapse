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
} from "@rabtx/ui/dialog";

export default function DialogDefault() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="secondary">Share project</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Share project</DialogTitle>
					<DialogDescription>
						Anyone with the link can view this project. Only members can edit it.
					</DialogDescription>
				</DialogHeader>
				<p className="rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
					https://rabtx.dev/p/q3-roadmap
				</p>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="ghost">Cancel</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button>Copy link</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
