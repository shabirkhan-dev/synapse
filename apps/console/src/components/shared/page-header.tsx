import type { ReactNode } from "react";

export type PageHeaderProps = {
	title: ReactNode;
	/** One or two sentences under the title: what the page is for. */
	children?: ReactNode;
	/** A status next to the title (e.g. your role); not part of the heading's name. */
	badge?: ReactNode;
	/** Controls aligned to the end of the header (a range picker, a primary action). */
	actions?: ReactNode;
};

/** The title block every workspace page starts with. */
export function PageHeader({ title, children, badge, actions }: PageHeaderProps) {
	return (
		<header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
			<div className="flex min-w-0 flex-col gap-1">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
					<h1 className="text-2xl font-semibold tracking-tight text-balance break-words">
						{title}
					</h1>
					{badge}
				</div>
				{children ? (
					<p className="max-w-prose text-sm text-pretty text-muted-foreground">{children}</p>
				) : null}
			</div>
			{actions}
		</header>
	);
}
