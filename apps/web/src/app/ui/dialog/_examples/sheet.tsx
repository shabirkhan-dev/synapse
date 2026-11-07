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
import { Switch } from "@rabtx/ui/switch";

const settings = ["Email digests", "Mentions", "Weekly report"];

export default function DialogSheet() {
	return (
		<>
			<Dialog>
				<DialogTrigger asChild>
					<Button variant="secondary">Right sheet</Button>
				</DialogTrigger>
				<DialogContent side="right">
					<DialogHeader>
						<DialogTitle>Notifications</DialogTitle>
						<DialogDescription>Choose what reaches your inbox.</DialogDescription>
					</DialogHeader>
					<div className="grid content-start gap-3">
						{settings.map((label, index) => (
							<Switch key={label} defaultChecked={index !== 2}>
								{label}
							</Switch>
						))}
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button>Done</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog>
				<DialogTrigger asChild>
					<Button variant="secondary">Bottom sheet</Button>
				</DialogTrigger>
				<DialogContent side="bottom">
					<DialogHeader>
						<DialogTitle>Move to</DialogTitle>
						<DialogDescription>Pick the board for these 3 tasks.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-2 sm:grid-cols-3">
						{["Backlog", "This week", "Done"].map((board) => (
							<DialogClose key={board} asChild>
								<Button variant="outline">{board}</Button>
							</DialogClose>
						))}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
