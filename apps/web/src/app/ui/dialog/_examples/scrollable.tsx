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

const sections = Array.from({ length: 12 }, (_, index) => index + 1);

export default function DialogScrollable() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="secondary">Terms of service</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Terms of service</DialogTitle>
					<DialogDescription>Last updated 1 November 2026.</DialogDescription>
				</DialogHeader>
				{/* The middle scrolls; the header and the actions stay put. Browsers make it focusable. */}
				<div
					role="region"
					aria-label="Terms"
					className="-mx-[19px] max-h-[50dvh] overflow-y-auto border-y border-border px-[19px] py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{sections.map((n) => (
						<p key={n} className="mb-3 text-[13px] text-muted-foreground last:mb-0">
							<strong className="font-medium text-foreground">
								{n}. Section {n}.
							</strong>{" "}
							You keep ownership of everything you put in a project. We store it to run the service,
							back it up, and delete it within 30 days of a request. Nothing here limits rights you
							have by law.
						</p>
					))}
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="ghost">Decline</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button>Accept</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
