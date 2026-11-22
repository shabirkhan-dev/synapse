import { Skeleton } from "@synapse/ui/components/skeleton";

/** A page's outline (title, a card) while the session is restored; announced once, politely. */
export function PageSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			<p role="status" className="sr-only">
				Loading your workspace…
			</p>
			<div className="flex flex-col gap-2" aria-hidden="true">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-4 w-80 max-w-full" />
			</div>
			<Skeleton className="h-64 rounded-2xl" aria-hidden="true" />
		</div>
	);
}
