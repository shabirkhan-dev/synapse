import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { type ExampleName, examples } from "./examples";

/**
 * A live @rabtx/ui example above its own source. The source is read from the example's file, so
 * the code shown is always the code running.
 */
export async function ComponentPreview({
	name,
	block,
}: {
	name: ExampleName;
	/** A whole screen, such as a sign-up card: a taller, tinted stage, aligned to the top. */
	block?: boolean;
}) {
	const Example = examples[name];
	const code = (
		await readFile(join(process.cwd(), "src/components/rabtx/examples", `${name}.tsx`), "utf8")
	).trim();

	return (
		<Tabs items={["Preview", "Code"]} className="not-prose">
			<Tab value="Preview">
				<div
					className={
						block
							? "rabtx flex min-h-[44rem] items-start justify-center bg-muted px-4 py-10 text-foreground sm:px-6"
							: "rabtx flex min-h-36 flex-wrap items-center justify-center gap-3 p-6 text-foreground"
					}
				>
					<Example />
				</div>
			</Tab>
			<Tab value="Code">
				<ServerCodeBlock code={code} lang="tsx" />
			</Tab>
		</Tabs>
	);
}
