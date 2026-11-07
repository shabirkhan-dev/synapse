import { fileURLToPath } from "node:url";

/** `packages/evaluation/baselines/` — committed baselines. Valid when running from source. */
export const BASELINES_DIR = fileURLToPath(new URL("../../baselines", import.meta.url));
