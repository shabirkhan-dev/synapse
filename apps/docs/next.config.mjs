import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	// @rabtx/ui ships TypeScript source, like it does for apps/web.
	transpilePackages: ["@rabtx/ui"],
	// The shadcn registry route reads the built items from registry/r at request time.
	outputFileTracingIncludes: { "/r/[name]": ["./registry/r/**"] },
};

export default withMDX(config);
