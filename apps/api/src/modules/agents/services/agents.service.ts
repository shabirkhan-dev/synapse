import { AUDIT_ACTIONS, type AuditLog, type StoredAuditEvent } from "@synapse/audit";
import {
	CHAT_ASSISTANT_PROMPT,
	promptVersion,
	RAG_ANSWER_CITED_PROMPT,
	RAG_ANSWER_PROMPT,
} from "@synapse/generation";
import { can } from "@synapse/security";

import type { Configuration } from "@/config";
import { CHAT_TOOLS } from "@/modules/chat";
import { CHAT_ALLOWED_TOOLS } from "@/modules/guardrails";
import { OVERSIGHT_ACTIONS } from "@/modules/oversight";
import type { RagService } from "@/modules/rag";
import type { AuthUser } from "@/shared/types/app-types";

import { AGENT_RUN_LIMIT, APPROVAL_ACTION_LABELS } from "../constants/agents.constants";
import type { AgentRun, AgentsOverview, ModelRef } from "../types/agents.types";

const ref = ({ provider, model }: ModelRef): ModelRef => ({ provider, model });

const stringList = (value: unknown): string[] =>
	Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/**
 * What the assistants run on (from configuration and code, never credentials) and what they did
 * (answers in the audit history). Admins and owners see every member's runs; members their own.
 */
export class AgentsService {
	constructor(
		private readonly config: Pick<Configuration, "ai" | "rag" | "guardrails">,
		private readonly rag: Pick<RagService, "versions">,
		private readonly audit: AuditLog,
	) {}

	overview(): AgentsOverview {
		const { ai, rag, guardrails } = this.config;
		return {
			models: {
				chat: ref(ai.chat),
				fallbackChat: ai.fallbackChat ? ref(ai.fallbackChat) : null,
				embedding: ref(ai.embedding),
				reranker: ai.rerank ? ref(ai.rerank.spec) : null,
			},
			chat: {
				promptVersion: promptVersion(CHAT_ASSISTANT_PROMPT),
				maxSteps: rag.chatMaxSteps,
				history: rag.chatHistory,
				tools: Object.entries(CHAT_TOOLS).map(([name, tool]) => ({
					name,
					description: tool.description,
				})),
			},
			answers: {
				promptVersions: [promptVersion(RAG_ANSWER_PROMPT), promptVersion(RAG_ANSWER_CITED_PROMPT)],
				searchMode: rag.searchMode,
				topK: rag.topK,
				maxContextTokens: rag.maxContextTokens,
			},
			index: this.rag.versions,
			guardrails: {
				maxInputChars: guardrails.maxInputChars,
				blockedTerms: guardrails.blockedTerms.length,
				allowedTools: [...CHAT_ALLOWED_TOOLS],
			},
			approvals: Object.values(OVERSIGHT_ACTIONS).map((action) => ({
				action,
				label: APPROVAL_ACTION_LABELS[action] ?? action,
			})),
		};
	}

	/** The latest chat and cited answers, newest first. */
	async runs(user: AuthUser): Promise<AgentRun[]> {
		const actorId = can(user.role, "audit.read_all") ? {} : { actorId: user.sub };
		const [chat, answers] = await Promise.all(
			[AUDIT_ACTIONS.CHAT_MESSAGE_ANSWERED, AUDIT_ACTIONS.RAG_QUERY_ANSWERED].map((action) =>
				this.audit.list(user.orgId, { limit: AGENT_RUN_LIMIT, action, ...actorId }),
			),
		);
		return [...(chat ?? []), ...(answers ?? [])]
			.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
			.slice(0, AGENT_RUN_LIMIT)
			.map(toRun);
	}
}

function toRun(event: StoredAuditEvent): AgentRun {
	const isChat = event.action === AUDIT_ACTIONS.CHAT_MESSAGE_ANSWERED;
	const usage = event.provenance?.usage;
	return {
		id: event.id,
		agent: isChat ? "chat" : "answer",
		actorId: event.actorId,
		createdAt: event.createdAt,
		question: !isChat && typeof event.data.question === "string" ? event.data.question : null,
		chatModel: event.provenance?.chatModel ?? null,
		promptVersion: event.provenance?.promptVersion ?? null,
		tools: isChat ? stringList(event.data.tools) : [],
		citations: isChat ? null : stringList(event.data.citedChunkIds).length,
		steps: isChat && typeof event.data.steps === "number" ? event.data.steps : null,
		inputTokens: usage?.inputTokens ?? null,
		outputTokens: usage?.outputTokens ?? null,
	};
}
