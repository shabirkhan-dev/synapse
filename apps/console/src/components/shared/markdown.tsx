import type { ComponentProps, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { CITATION_MARK_CLASS } from "./citation-mark";

export type MarkdownProps = {
	/** Model output: Markdown, untrusted. Raw HTML in it is shown as text, never rendered. */
	text: string;
	/**
	 * Citation numbers that exist; each `[n]` among them becomes whatever `renderCitation` returns
	 * (by default a link to `#citation-n`). Other `[n]` stay text.
	 */
	citations?: ReadonlySet<number>;
	renderCitation?: (index: number) => ReactNode;
};

const CITATION_HREF = "#citation-";
const NO_CITATIONS: ReadonlySet<number> = new Set();

type MdNode = { type: string; value?: string; children?: MdNode[] };

/** Raw HTML in the model's text is shown as the text it is, never parsed into elements. */
function htmlAsText() {
	const walk = (node: MdNode) => {
		if (node.type === "html") node.type = "text";
		node.children?.forEach(walk);
	};
	return (tree: MdNode) => walk(tree);
}

/** `[n]` → a Markdown link we recognise below; only for citations that exist. */
function linkCitations(text: string, citations: ReadonlySet<number>): string {
	return text.replace(/\[(\d{1,3})\](?!\()/g, (match, digits: string) =>
		citations.has(Number(digits)) ? `[\\[${digits}\\]](${CITATION_HREF}${digits})` : match,
	);
}

const isWebLink = (href: string | undefined): href is string =>
	typeof href === "string" && /^https?:\/\//i.test(href);

function components(renderCitation: (index: number) => ReactNode): Components {
	return {
		p: (props) => <p className="leading-relaxed text-pretty" {...strip(props)} />,
		ul: (props) => <ul className="ms-5 list-disc space-y-1" {...strip(props)} />,
		ol: (props) => <ol className="ms-5 list-decimal space-y-1" {...strip(props)} />,
		li: (props) => <li className="ps-1 leading-relaxed" {...strip(props)} />,
		strong: (props) => <strong className="font-semibold" {...strip(props)} />,
		h1: ({ children }) => <h3 className="text-base font-semibold">{children}</h3>,
		h2: ({ children }) => <h3 className="text-base font-semibold">{children}</h3>,
		h3: ({ children }) => <h4 className="font-semibold">{children}</h4>,
		h4: ({ children }) => <h5 className="font-semibold">{children}</h5>,
		blockquote: (props) => (
			<blockquote className="border-s-2 ps-3 text-muted-foreground" {...strip(props)} />
		),
		code: ({ className, ...props }) => (
			<code
				className={
					className
						? `${className} font-mono text-[0.85em]`
						: "rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
				}
				{...strip(props)}
			/>
		),
		pre: (props) => (
			<pre
				className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed"
				{...strip(props)}
			/>
		),
		table: (props) => (
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-left text-xs" {...strip(props)} />
			</div>
		),
		th: (props) => <th className="border-b px-2 py-1.5 font-medium" {...strip(props)} />,
		td: (props) => <td className="border-b px-2 py-1.5 align-top" {...strip(props)} />,
		hr: () => <hr className="border-border" />,
		img: ({ alt }) => <span>{alt}</span>,
		a: ({ href, children }) => {
			if (href?.startsWith(CITATION_HREF)) {
				return <>{renderCitation(Number(href.slice(CITATION_HREF.length)))}</>;
			}
			// Only web links are followed; anything else (mailto:, relative, odd schemes) stays text.
			return isWebLink(href) ? (
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="font-medium text-primary underline underline-offset-2"
				>
					{children}
				</a>
			) : (
				<>{children}</>
			);
		},
	};
}

/** react-markdown passes its AST `node`; it must not reach the DOM. */
function strip<T extends { node?: unknown }>({ node: _node, ...props }: T): Omit<T, "node"> {
	return props;
}

function defaultCitation(index: number) {
	return (
		<a
			href={`${CITATION_HREF}${index}`}
			className={CITATION_MARK_CLASS}
			aria-label={`Source ${index}`}
		>
			{index}
		</a>
	);
}

/** Model output as Markdown: lists, emphasis, code and tables, never raw HTML. */
export function Markdown({
	text,
	citations = NO_CITATIONS,
	renderCitation = defaultCitation,
	className,
	...rest
}: MarkdownProps & Omit<ComponentProps<"div">, "children">) {
	return (
		<div className={`flex flex-col gap-3 break-words ${className ?? "text-sm"}`} {...rest}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm, htmlAsText]}
				skipHtml
				components={components(renderCitation)}
			>
				{citations.size > 0 ? linkCitations(text, citations) : text}
			</ReactMarkdown>
		</div>
	);
}
