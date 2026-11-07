import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@rabtx/ui/collapsible";

export default function CollapsibleDefault() {
	return (
		<Collapsible className="w-full max-w-sm rounded-xl border border-border bg-card p-1">
			<CollapsibleTrigger>More details</CollapsibleTrigger>
			<CollapsibleContent className="px-3 pt-1 pb-3 text-sm leading-6 text-muted-foreground">
				Keep extra information tucked away until someone needs it. Find in page opens it.
			</CollapsibleContent>
		</Collapsible>
	);
}
