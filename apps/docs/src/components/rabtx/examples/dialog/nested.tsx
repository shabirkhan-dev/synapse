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

export default function DialogNested() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="secondary">Workspace settings</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Workspace settings</DialogTitle>
					<DialogDescription>Acme · 12 members</DialogDescription>
				</DialogHeader>
				<p className="text-[13px] text-muted-foreground">
					A dialog opened from here stacks on top. Escape closes only the top one.
				</p>
				<DialogFooter>
					<Dialog>
						<DialogTrigger asChild>
							<Button variant="outline">Leave workspace</Button>
						</DialogTrigger>
						<DialogContent size="sm" showClose={false}>
							<DialogHeader>
								<DialogTitle>Leave Acme?</DialogTitle>
								<DialogDescription>
									You lose access until someone invites you again.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<DialogClose asChild>
									<Button variant="ghost">Stay</Button>
								</DialogClose>
								<DialogClose asChild>
									<Button>Leave</Button>
								</DialogClose>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<DialogClose asChild>
						<Button>Done</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
