import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

/**
 * Small labels after the references: a neutral chip (`default`, a count or a role), an outlined one,
 * and tinted states (fintrack's Paid / Pending / Overdue / On Track / In Progress), each text at
 * 4.5:1+ on its tint. `count` is a mono number chip ("3" beside a column title).
 */
const badgeVariants = cva(
	"group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border border-transparent px-2 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/25 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
	{
		variants: {
			variant: {
				default: "bg-muted text-foreground [a]:hover:bg-accent",
				secondary: "bg-muted text-muted-foreground [a]:hover:bg-accent",
				outline: "border-border bg-card text-foreground [a]:hover:bg-muted",
				count:
					"h-5 min-w-5 rounded-md bg-muted px-1.5 font-mono text-[0.6875rem] text-muted-foreground tabular-nums",
				success: "bg-tone-green/10 text-tone-green dark:bg-tone-green/14",
				warning: "bg-tone-amber/10 text-tone-amber dark:bg-tone-amber/14",
				destructive: "bg-tone-red/10 text-tone-red dark:bg-tone-red/14",
				info: "bg-tone-blue/10 text-tone-blue dark:bg-tone-blue/14",
				violet: "bg-tone-violet/10 text-tone-violet dark:bg-tone-violet/14",
				orange: "bg-tone-orange/10 text-tone-orange dark:bg-tone-orange/14",
				ghost: "hover:bg-muted hover:text-muted-foreground",
				link: "text-link underline-offset-4 hover:underline",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Badge({
	className,
	variant = "default",
	render,
	...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
	return useRender({
		defaultTagName: "span",
		props: mergeProps<"span">(
			{
				className: cn(badgeVariants({ variant }), className),
			},
			props,
		),
		render,
		state: {
			slot: "badge",
			variant,
		},
	});
}

export { Badge, badgeVariants };
