import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import { cn } from "cn";

function Card({
	className,
	size = "default",
	...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
	return (
		<div
			data-slot="card"
			data-size={size}
			className={cn(
				"group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-2xl border bg-card py-(--card-spacing) text-sm text-card-foreground shadow-card [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:rounded-xl data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl",
				className,
			)}
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				"group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-2xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
				className,
			)}
			{...props}
		/>
	);
}

/** A section heading (`h2`); pass `render={<h1 />}` when the card is the page, e.g. sign-in. */
function CardTitle({ className, render, ...props }: useRender.ComponentProps<"h2">) {
	return useRender({
		defaultTagName: "h2",
		props: mergeProps<"h2">(
			{
				className: cn(
					"flex items-center gap-2 font-heading text-base font-medium tracking-tight [&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-muted-foreground",
					className,
				),
			},
			props,
		),
		render,
		state: { slot: "card-title" },
	});
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-description"
			className={cn("max-w-prose text-sm text-pretty text-muted-foreground", className)}
			{...props}
		/>
	);
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-action"
			className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="card-content" className={cn("px-(--card-spacing)", className)} {...props} />
	);
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-footer"
			className={cn(
				"flex items-center gap-2 rounded-b-2xl px-(--card-spacing) text-xs text-muted-foreground [.border-t]:pt-4 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		/>
	);
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
