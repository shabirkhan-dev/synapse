import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** The one theme file. The table below is read from it, so it can never drift from the CSS. */
const THEME = join(process.cwd(), "../../packages/rabtx/src/styles/theme.css");

type Token = { name: string; light: string; dark?: string };
type Group = { title: string; tokens: Token[] };

function blockAfter(css: string, selectorStart: string): string {
	const start = css.indexOf(selectorStart);
	if (start < 0) throw new Error(`theme.css has no "${selectorStart}" block`);
	const open = css.indexOf("{", start);
	return css.slice(open + 1, css.indexOf("\n}", open));
}

function declarations(block: string): Map<string, string> {
	const out = new Map<string, string>();
	for (const match of block.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/--([\w-]+):\s*([^;]+);/g)) {
		out.set(match[1], match[2].replace(/\s+/g, " ").trim());
	}
	return out;
}

/** The light block, split into groups at each comment, with the dark value beside each token. */
async function readGroups(): Promise<Group[]> {
	const css = await readFile(THEME, "utf8");
	const light = blockAfter(css, ":root,\n.rabtx {");
	const dark = declarations(blockAfter(css, ".dark,\n"));
	const groups: Group[] = [{ title: "Base", tokens: [] }];
	for (const part of light.split(/(\/\*[\s\S]*?\*\/)/)) {
		if (part.startsWith("/*")) {
			const title = part
				.replace(/^\/\*+|\*+\/$/g, "")
				.replace(/^\s*\*\s?/gm, "")
				.trim()
				.split(/[.:]\s/)[0];
			groups.push({ title, tokens: [] });
			continue;
		}
		for (const [name, value] of declarations(part)) {
			groups[groups.length - 1].tokens.push({ name, light: value, dark: dark.get(name) });
		}
	}
	const springs = declarations(
		blockAfter(css.slice(css.indexOf("springs:start")), ":root,\n.rabtx {"),
	);
	groups.push({
		title: "Springs (generated from src/motion/springs.ts; each also has a -duration)",
		tokens: [...springs]
			.filter(([name]) => !name.endsWith("-duration"))
			.map(([name]) => ({ name, light: `linear(…), ${springs.get(`${name}-duration`)}` })),
	});
	return groups.filter((group) => group.tokens.length > 0);
}

function Sample({ token }: { token: Token }) {
	const value = `var(--${token.name})`;
	if (token.name.startsWith("radius"))
		return <div className="size-8 border-2 border-foreground/40" style={{ borderRadius: value }} />;
	if (token.name.startsWith("shadow"))
		return <div className="size-8 rounded-md bg-background" style={{ boxShadow: value }} />;
	if (/^(font|motion|spring)/.test(token.name)) return null;
	return (
		<div
			className="size-8 rounded-md"
			style={{ background: value, boxShadow: "inset 0 0 0 1px rgb(128 128 128 / 0.25)" }}
		/>
	);
}

/** Every token in theme.css with live swatches, rendered inside the Rabtx scope in both modes. */
export async function ThemeTokens() {
	const groups = await readGroups();
	return (
		<div className="not-prose flex flex-col gap-8">
			{groups.map((group) => (
				<section key={group.title}>
					<h3 className="mb-3 text-sm font-semibold">{group.title}</h3>
					<div className="overflow-x-auto rounded-xl border border-fd-border">
						<table className="w-full table-fixed text-left text-sm">
							<thead className="text-fd-muted-foreground">
								<tr>
									<th className="w-[34%] p-3 font-medium">Token</th>
									<th className="p-3 font-medium">Light</th>
									<th className="p-3 font-medium">Dark</th>
								</tr>
							</thead>
							<tbody>
								{group.tokens.map((token) => (
									<tr key={token.name} className="border-t border-fd-border">
										<td className="p-3 align-middle font-mono text-xs break-all">--{token.name}</td>
										<td className="rabtx light bg-background p-3 align-middle text-foreground">
											<div className="flex items-center gap-3">
												<Sample token={token} />
												<code className="text-xs break-all">{token.light}</code>
											</div>
										</td>
										<td className="rabtx dark bg-background p-3 align-middle text-foreground">
											<div className="flex items-center gap-3">
												<Sample token={token} />
												<code className="text-xs break-all">{token.dark ?? "same"}</code>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			))}
		</div>
	);
}
