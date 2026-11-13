export type ModelRef = { provider: string; model: string };

export type AgentsOverview = {
	models: {
		chat: ModelRef;
		/** Used when the chat model's circuit is open or it fails; null when not configured. */
		fallbackChat: ModelRef | null;
		embedding: ModelRef;
		reranker: ModelRef | null;
	};
	chat: {
		promptVersion: string;
		maxSteps: number;
		history: { maxTokens: number; maxMessages: number };
		tools: { name: string; description: string }[];
	};
	answers: {
		/** The first prompt, and the stricter one retried once when nothing was cited. */
		promptVersions: string[];
		searchMode: string;
		topK: number;
		maxContextTokens: number;
	};
	index: { embeddingModel: string; chunkerVersion: string };
	guardrails: { maxInputChars: number; blockedTerms: number; allowedTools: string[] };
	approvals: { action: string; label: string }[];
};

export type AgentRun = {
	id: string;
	/** `chat`: the streaming chat assistant; `answer`: the cited-answer graph (Playground). */
	agent: "chat" | "answer";
	actorId: string;
	createdAt: string;
	/** The question (answers only; chat messages are kept with the conversation). */
	question: string | null;
	chatModel: string | null;
	promptVersion: string | null;
	tools: string[];
	/** Passages cited (answers) or tool steps taken (chat). */
	citations: number | null;
	steps: number | null;
	inputTokens: number | null;
	outputTokens: number | null;
};
