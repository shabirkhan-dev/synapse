/** The search modes, in the order the page shows them; `hybrid` is what answers use. */
export const MODES = [
	{ mode: "hybrid", label: "Hybrid", description: "Meaning and keywords fused (what answers use)" },
	{ mode: "vector", label: "Meaning", description: "Closest by embedding (cosine similarity)" },
	{ mode: "keyword", label: "Keywords", description: "Full-text match on the words you typed" },
] as const;

export const PASSAGES_DEFAULT = 5;
export const PASSAGES_MAX = 20;
