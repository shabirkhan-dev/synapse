import { createHash } from "node:crypto";

/** SHA-256 (hex) of normalized content. Two documents with the same hash are duplicates. */
export function contentHash(normalizedContent: string): string {
	return createHash("sha256").update(normalizedContent, "utf8").digest("hex");
}
