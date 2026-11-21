import type { OpenAPIHono } from "@hono/zod-openapi";

import type { Configuration } from "@/config";
import type { AuditLog } from "@synapse/audit";

import { AgentsService, createAgentRoutes } from "@/modules/agents";
import { createAuditRoutes, UsageService } from "@/modules/audit";
import {
	type ApiKeysService,
	type AuthService,
	type MfaService,
	createApiKeyRoutes,
	createAuthMiddleware,
	createMfaRoutes,
	createAuthRoutes,
	createSessionOnlyMiddleware,
} from "@/modules/auth";
import { createMemoryRoutes, type MemoryService } from "@/modules/memory";
import { createOrganizationRoutes, type OrganizationsService } from "@/modules/organizations";
import { type ChatService, createChatRoutes } from "@/modules/chat";
import { createEvaluationRoutes, type EvaluationsService } from "@/modules/evaluations";
import { createHealthRoutes } from "@/modules/health";
import { createOversightRoutes, type OversightService } from "@/modules/oversight";
import { createRagRoutes, type RagService } from "@/modules/rag";
import { createSystemRoutes, type SystemService } from "@/modules/system";
import { createUsageLimit, type UsageLimiter } from "@/shared/middleware/usage-limit";
import type { AppBindings } from "@/shared/types/app-types";

export type RouteDependencies = {
	config: Configuration;
	auth: AuthService;
	/** Personal API keys, accepted as bearer tokens next to access tokens. */
	apiKeys: ApiKeysService;
	/** Two-step sign-in management (`/auth/mfa`). */
	mfa: MfaService;
	rag: RagService;
	oversight: OversightService;
	audit: AuditLog;
	memory: MemoryService;
	organizations: OrganizationsService;
	chat: ChatService;
	evaluations: EvaluationsService;
	system: SystemService;
	/** Per-user budgets on model-calling routes (`config.limits`). */
	rateLimiter: UsageLimiter;
	pingDatabase: () => Promise<void>;
};

/** Mount every module router under the versioned base path. Protected modules get auth first. */
export function registerRoutes(
	app: OpenAPIHono<AppBindings>,
	{
		config,
		auth,
		apiKeys,
		mfa,
		rag,
		oversight,
		audit,
		memory,
		organizations,
		chat,
		evaluations,
		system,
		rateLimiter,
		pingDatabase,
	}: RouteDependencies,
) {
	const { basePath, serviceName } = config.app;
	const authenticate = createAuthMiddleware(auth, apiKeys);
	const sessionOnly = createSessionOnlyMiddleware();

	app.use(`${basePath}/auth/sign-out`, authenticate);
	app.use(`${basePath}/auth/me`, authenticate);
	app.use(`${basePath}/auth/sessions`, authenticate);
	app.use(`${basePath}/auth/sessions/*`, authenticate);
	app.use(`${basePath}/auth/verify-email/resend`, authenticate);
	app.use(`${basePath}/auth/switch-organization`, authenticate);
	app.use(`${basePath}/auth/api-keys`, authenticate);
	app.use(`${basePath}/auth/api-keys/*`, authenticate);
	app.use(`${basePath}/auth/mfa`, authenticate);
	app.use(`${basePath}/auth/mfa/*`, authenticate);
	// A leaked key must not mint keys, end sessions or switch organizations.
	for (const path of [
		"auth/sign-out",
		"auth/sessions",
		"auth/sessions/*",
		"auth/switch-organization",
		"auth/api-keys",
		"auth/api-keys/*",
		"auth/mfa",
		"auth/mfa/*",
	]) {
		app.use(`${basePath}/${path}`, sessionOnly);
	}
	app.use(`${basePath}/organizations`, authenticate);
	app.use(`${basePath}/organizations/*`, authenticate);
	app.use(`${basePath}/rag/*`, authenticate);
	app.use(`${basePath}/oversight/*`, authenticate);
	app.use(`${basePath}/audit/*`, authenticate);
	app.use(`${basePath}/memory`, authenticate);
	app.use(`${basePath}/memory/*`, authenticate);
	app.use(`${basePath}/chat`, authenticate);
	app.use(`${basePath}/chat/*`, authenticate);
	app.use(`${basePath}/evaluations/*`, authenticate);
	app.use(`${basePath}/agents`, authenticate);
	app.use(`${basePath}/agents/*`, authenticate);
	app.use(`${basePath}/system/*`, authenticate);

	// After authentication: budgets are per user, and stop a request before any model call.
	const { questions, ingests, evaluationRuns } = config.limits;
	app.on(
		"POST",
		[`${basePath}/chat`, `${basePath}/rag/query`, `${basePath}/rag/follow-ups`],
		createUsageLimit(rateLimiter, "questions", questions),
	);
	app.on(
		"POST",
		[
			`${basePath}/rag/documents`,
			`${basePath}/rag/documents/upload`,
			`${basePath}/rag/documents/url`,
		],
		createUsageLimit(rateLimiter, "ingests", ingests),
	);
	app.on(
		"POST",
		`${basePath}/evaluations/runs`,
		createUsageLimit(rateLimiter, "evaluation-runs", evaluationRuns),
	);

	app.route(`${basePath}/health`, createHealthRoutes({ serviceName, pingDatabase }));
	app.route(`${basePath}/auth/api-keys`, createApiKeyRoutes(apiKeys));
	app.route(`${basePath}/auth/mfa`, createMfaRoutes(mfa));
	app.route(`${basePath}/auth`, createAuthRoutes(auth, config.auth));
	app.route(`${basePath}/rag`, createRagRoutes(rag, oversight));
	app.route(`${basePath}/oversight`, createOversightRoutes(oversight));
	app.route(
		`${basePath}/audit`,
		createAuditRoutes(audit, new UsageService({ audit, prices: config.observability.modelPrices })),
	);
	app.route(`${basePath}/memory`, createMemoryRoutes(memory));
	app.route(`${basePath}/organizations`, createOrganizationRoutes(organizations));
	app.route(`${basePath}/chat`, createChatRoutes(chat));
	app.route(`${basePath}/evaluations`, createEvaluationRoutes(evaluations));
	app.route(`${basePath}/agents`, createAgentRoutes(new AgentsService(config, rag, audit)));
	app.route(`${basePath}/system`, createSystemRoutes(system));
}
