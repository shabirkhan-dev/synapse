import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { readRegistryTree, registryCss, registryOrigin, targetPath } from "@/lib/registry";

/**
 * How to add one component to a shadcn project: the CLI command, or every file, dependency and
 * line of CSS the command would have written, read from the built registry item.
 */
export async function Installation({ name }: { name: string }) {
	const origin = registryOrigin();
	const items = await readRegistryTree(name);
	const item = items[items.length - 1];
	const dependencies = [...new Set(items.flatMap((entry) => entry.dependencies ?? []))];
	const files = items.flatMap((entry) => entry.files ?? []);
	const needsUtils = items.some((entry) => entry.registryDependencies?.includes("utils"));

	const namespace = `{\n  "registries": {\n    "@rabtx": "${origin}/r/{name}.json"\n  }\n}`;
	const cli = `npx shadcn@latest add @rabtx/${item.name}`;
	const url = `npx shadcn@latest add ${origin}/r/${item.name}.json`;

	return (
		<Tabs items={["CLI", "Manual"]} className="not-prose">
			<Tab value="CLI">
				<Steps>
					<Step>
						<p className="mb-2 font-medium">Add the registry to components.json, once</p>
						<ServerCodeBlock
							code={namespace}
							lang="json"
							codeblock={{ title: "components.json" }}
						/>
					</Step>
					<Step>
						<p className="mb-2 font-medium">Add the component</p>
						<ServerCodeBlock code={cli} lang="bash" />
						<p className="mt-3 mb-2 text-sm text-fd-muted-foreground">
							Or, without the namespace, by URL:
						</p>
						<ServerCodeBlock code={url} lang="bash" />
						<p className="mt-3 text-sm text-fd-muted-foreground">
							{item.type === "registry:block" ? (
								<>
									The block lands in <code>components/blocks</code> and the components it uses in
									your <code>components/ui</code>, styled by your own theme.
								</>
							) : (
								<>
									The files land in your <code>components/ui</code> and are styled by your own
									theme.
								</>
							)}{" "}
							Add <code>--overwrite</code> to replace a shadcn component with the same name.
						</p>
					</Step>
				</Steps>
			</Tab>
			<Tab value="Manual">
				<Steps>
					{dependencies.length > 0 ? (
						<Step>
							<p className="mb-2 font-medium">Install the dependencies</p>
							<ServerCodeBlock code={`npm install ${dependencies.join(" ")}`} lang="bash" />
						</Step>
					) : null}
					{needsUtils ? (
						<Step>
							<p className="font-medium">
								Have shadcn&apos;s <code>cn</code> helper at <code>lib/utils.ts</code>
							</p>
							<p className="mt-1 text-sm text-fd-muted-foreground">
								<code>npx shadcn@latest init</code> writes it.
							</p>
						</Step>
					) : null}
					<Step>
						<p className="mb-2 font-medium">Copy the files</p>
						<div className="flex flex-col gap-3">
							{await Promise.all(
								files.map(async (file) => (
									<ServerCodeBlock
										key={file.path}
										code={file.content.trim()}
										lang={file.path.endsWith(".tsx") ? "tsx" : "ts"}
										codeblock={{ title: targetPath(file), className: "max-h-96" }}
									/>
								)),
							)}
						</div>
					</Step>
					<Step>
						<p className="mb-2 font-medium">Add the styles to your global CSS</p>
						<ServerCodeBlock
							code={registryCss(items)}
							lang="css"
							codeblock={{ title: "app/globals.css", className: "max-h-96" }}
						/>
					</Step>
				</Steps>
			</Tab>
		</Tabs>
	);
}
