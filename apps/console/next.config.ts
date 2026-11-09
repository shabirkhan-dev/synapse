import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	outputFileTracingRoot: path.join(__dirname, "../.."),
	// @synapse/ui ships TypeScript source (shadcn components), so Next compiles it.
	transpilePackages: ["@synapse/ui"],
};

export default nextConfig;
