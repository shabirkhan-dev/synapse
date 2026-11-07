export type DatasetDocument = {
	/** Stable id used by `relevant` in cases. */
	id: string;
	title: string;
	content: string;
	source?: string;
};

export type RetrievalCase = {
	id: string;
	query: string;
	/** Dataset document ids that answer the query. */
	relevant: string[];
	/** What the case exercises, e.g. `keyword`, `paraphrase`. */
	tags?: string[];
};

export type RetrievalDataset = {
	name: string;
	/** Bump when documents or cases change; baselines are per version. */
	version: number;
	documents: DatasetDocument[];
	cases: RetrievalCase[];
};
