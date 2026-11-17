const SKIPPED =
	"head, script, style, noscript, template, svg, canvas, iframe, object, nav, aside, form, button, select, body > header, body > footer";
const BLOCKS = "p, div, section, article, main, br, tr, table, pre, blockquote, figure, dd, dt, hr";
const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
const VOID = new Set(["br", "hr"]);

const NAMED: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	mdash: "—",
	ndash: "–",
	hellip: "…",
	lsquo: "‘",
	rsquo: "’",
	ldquo: "“",
	rdquo: "”",
	copy: "©",
	reg: "®",
	trade: "™",
	euro: "€",
	pound: "£",
	middot: "·",
	bull: "•",
};

/** HTML entities in text (HTMLRewriter hands text over as written). Unknown names stay as they are. */
export function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
		if (entity[0] === "#") {
			const code =
				entity[1] === "x" || entity[1] === "X"
					? Number.parseInt(entity.slice(2), 16)
					: Number.parseInt(entity.slice(1), 10);
			return Number.isFinite(code) && code > 0 && code <= 0x10ffff
				? String.fromCodePoint(code)
				: match;
		}
		return NAMED[entity.toLowerCase()] ?? match;
	});
}

/**
 * Readable text from an HTML page: the `<main>` or `<article>` when there is one, else the body
 * without navigation, scripts, forms and the page header/footer. Headings become Markdown
 * headings (so the chunker keeps sections), list items `- ` lines, blocks paragraphs.
 */
export async function htmlToText(html: string): Promise<{ title: string | null; text: string }> {
	const scoped = /<(main|article)[\s>]/i.test(html) ? "main, article" : null;
	const out: string[] = [];
	let title = "";
	let inTitle = false;
	let skip = 0;
	let inScope = scoped ? 0 : 1;
	let pre = 0;
	const push = (value: string) => {
		if (skip === 0 && inScope > 0) out.push(value);
	};

	let rewriter = new HTMLRewriter()
		.on("title", {
			element(element) {
				inTitle = true;
				element.onEndTag(() => {
					inTitle = false;
				});
			},
		})
		.on(SKIPPED, {
			element(element) {
				skip++;
				element.onEndTag(() => {
					skip--;
				});
			},
		})
		.on(BLOCKS, {
			element(element) {
				push("\n\n");
				if (element.tagName === "pre") pre++;
				if (!VOID.has(element.tagName)) {
					element.onEndTag(() => {
						if (element.tagName === "pre") pre--;
						push("\n\n");
					});
				}
			},
		})
		.on("li", {
			element() {
				push("\n- ");
			},
		});
	for (const [level, tag] of HEADINGS.entries()) {
		rewriter = rewriter.on(tag, {
			element(element) {
				push(`\n\n${"#".repeat(level + 1)} `);
				element.onEndTag(() => push("\n\n"));
			},
		});
	}
	if (scoped) {
		rewriter = rewriter.on(scoped, {
			element(element) {
				inScope++;
				element.onEndTag(() => {
					inScope--;
				});
			},
		});
	}
	rewriter = rewriter.onDocument({
		text(chunk) {
			if (inTitle) {
				title += chunk.text;
				return;
			}
			push(pre > 0 ? chunk.text : chunk.text.replace(/\s+/g, " "));
		},
	});
	await rewriter.transform(new Response(html)).text();

	const text = decodeEntities(out.join(""))
		.split("\n")
		.map((line) => line.replace(/[ \t]+/g, " ").trim())
		.join("\n")
		.replace(/^(#+|-)\s*$/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
	const cleanTitle = decodeEntities(title).replace(/\s+/g, " ").trim();
	const heading = /^#{1,6} (.+)$/m.exec(text)?.[1];
	return { title: cleanTitle || heading || null, text };
}
