"use client";

import * as React from "react";
import { cn } from "cn";

/**
 * A table that scrolls sideways when it is wider than its space. Then (and only then) its trailing
 * edge fades until the end is reached, a line under it says so, and the scroller becomes a focusable,
 * labelled region so keyboard users can scroll it too (WCAG 2.1.1, 1.4.10).
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
	const scroller = React.useRef<HTMLDivElement>(null);
	const [overflow, setOverflow] = React.useState({ wider: false, atEnd: true });

	React.useEffect(() => {
		const element = scroller.current;
		if (!element) return;
		const measure = () => {
			const wider = element.scrollWidth > element.clientWidth + 1;
			const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
			setOverflow((current) =>
				current.wider === wider && current.atEnd === atEnd ? current : { wider, atEnd },
			);
		};
		measure();
		element.addEventListener("scroll", measure, { passive: true });
		const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
		observer?.observe(element);
		if (element.firstElementChild) observer?.observe(element.firstElementChild);
		return () => {
			element.removeEventListener("scroll", measure);
			observer?.disconnect();
		};
	}, []);

	return (
		<div className="flex flex-col gap-1.5">
			<div className="relative">
				<div
					ref={scroller}
					data-slot="table-container"
					className="relative w-full overflow-x-auto"
					{...(overflow.wider
						? { tabIndex: 0, role: "region", "aria-label": "Table, scrolls sideways" }
						: {})}
				>
					<table
						data-slot="table"
						className={cn("w-full caption-bottom text-xs", className)}
						{...props}
					/>
				</div>
				{overflow.wider && !overflow.atEnd ? (
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-y-0 end-0 w-8 bg-linear-to-l from-card to-transparent"
					/>
				) : null}
			</div>
			{overflow.wider ? (
				<p className="text-xs text-muted-foreground">Scroll sideways to see all columns.</p>
			) : null}
		</div>
	);
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
	return <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
	return (
		<tbody
			data-slot="table-body"
			className={cn("[&_tr:last-child]:border-0", className)}
			{...props}
		/>
	);
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
	return (
		<tfoot
			data-slot="table-footer"
			className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
			{...props}
		/>
	);
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
	return (
		<tr
			data-slot="table-row"
			className={cn(
				"border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
				className,
			)}
			{...props}
		/>
	);
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
	return (
		<th
			data-slot="table-head"
			className={cn(
				"h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
				className,
			)}
			{...props}
		/>
	);
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
	return (
		<td
			data-slot="table-cell"
			className={cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
			{...props}
		/>
	);
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
	return (
		<caption
			data-slot="table-caption"
			className={cn("mt-4 text-xs text-muted-foreground", className)}
			{...props}
		/>
	);
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
