/** A document's source: a link only for http(s) URLs (never `javascript:` and the like). */
export function SourceLink({ source }: { source: string | null }) {
	if (!source) return null;
	const isWebLink = /^https?:\/\//i.test(source);
	return isWebLink ? (
		<a
			href={source}
			target="_blank"
			rel="noreferrer noopener"
			className="truncate text-muted-foreground underline-offset-4 hover:underline"
		>
			{source}
		</a>
	) : (
		<span className="truncate text-muted-foreground">{source}</span>
	);
}
