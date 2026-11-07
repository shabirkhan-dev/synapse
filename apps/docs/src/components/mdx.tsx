import defaultMdxComponents from "fumadocs-ui/mdx";
import { TypeTable } from "fumadocs-ui/components/type-table";
import type { MDXComponents } from "mdx/types";
import { Installation } from "@/components/rabtx/installation";
import { ComponentPreview } from "@/components/rabtx/preview";
import { ThemeTokens } from "@/components/rabtx/theme-tokens";

export function getMDXComponents(components?: MDXComponents) {
	return {
		...defaultMdxComponents,
		ComponentPreview,
		Installation,
		ThemeTokens,
		TypeTable,
		...components,
	} satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
