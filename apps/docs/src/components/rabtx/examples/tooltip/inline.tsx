import { Tooltip, TooltipContent, TooltipTrigger } from "@rabtx/ui/tooltip";

export default function TooltipInline() {
	return (
		<p className="max-w-md text-sm leading-6 text-muted-foreground">
			Invoices are due on{" "}
			<Tooltip>
				<TooltipTrigger className="cursor-help rounded-sm text-foreground underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
					net 30
				</TooltipTrigger>
				<TooltipContent>
					Payment is due 30 days after the invoice date. Late invoices pick up a 1.5% fee each month
					until they are paid, so send reminders a week before.
				</TooltipContent>
			</Tooltip>{" "}
			terms unless the contract says otherwise.
		</p>
	);
}
