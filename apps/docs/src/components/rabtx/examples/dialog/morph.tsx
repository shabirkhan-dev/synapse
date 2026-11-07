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

const plan = [
	["Seats", "12"],
	["Billing", "Yearly"],
	["Total", "$1,152"],
];

export default function DialogMorph() {
	return (
		<Dialog morph>
			<DialogTrigger asChild>
				<Button>Upgrade plan</Button>
			</DialogTrigger>
			<DialogContent size="sm">
				<DialogHeader>
					<DialogTitle>Upgrade to Team</DialogTitle>
					<DialogDescription>
						The panel grows out of the button and folds back into it.
					</DialogDescription>
				</DialogHeader>
				<dl className="grid grid-cols-[1fr_auto] gap-y-1 text-[13px]">
					{plan.map(([label, value]) => (
						<div key={label} className="contents">
							<dt className="text-muted-foreground">{label}</dt>
							<dd className="text-right tabular-nums">{value}</dd>
						</div>
					))}
				</dl>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="ghost">Not now</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button>Upgrade</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
