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

/** The button's private fill and hover, pointed at the theme's destructive color. */
const danger =
	"[--_bg:var(--destructive)] [--_bg-hover:color-mix(in_oklab,var(--destructive)_90%,transparent)]";

export default function DialogDestructive() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">Delete project</Button>
			</DialogTrigger>
			<DialogContent size="sm" showClose={false} dismissible={false}>
				<DialogHeader>
					<DialogTitle>Delete “Q3 roadmap”?</DialogTitle>
					<DialogDescription>
						The project, its 24 tasks and every file in it are deleted for everyone. This cannot be
						undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="ghost">Keep project</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button className={danger}>Delete</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
