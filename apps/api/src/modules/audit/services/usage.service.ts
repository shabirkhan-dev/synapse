import type { AuditLog, UsageGroup } from "@synapse/audit";
import { estimateCostUsd, type ModelPrices } from "@synapse/observability";
import { can } from "@synapse/security";

import type { AuthUser } from "@/shared/types/app-types";

import type { Usage } from "../types/usage.types";

const DAY_MS = 86_400_000;

export type UsageServiceOptions = {
	audit: AuditLog;
	/** `AI_MODEL_PRICES`: USD per million tokens by `provider:model`. */
	prices: ModelPrices;
	now?: () => Date;
};

/**
 * Answers, tokens and estimated cost over the last `days` UTC days, from the provenance every
 * answer records. Admins and owners see the organization; members see their own answers.
 */
export class UsageService {
	constructor(private readonly options: UsageServiceOptions) {}

	async summarize(user: AuthUser, days: number): Promise<Usage> {
		const today = startOfUtcDay(this.options.now?.() ?? new Date());
		const since = new Date(today.getTime() - (days - 1) * DAY_MS);
		const everyone = can(user.role, "audit.read_all");
		const groups = await this.options.audit.usage(user.orgId, {
			since,
			...(everyone ? {} : { actorId: user.sub }),
		});
		const models = byModel(groups, this.options.prices);
		const priced = models.filter((model) => model.costUsd !== null);
		return {
			scope: everyone ? "organization" : "you",
			days,
			since: since.toISOString(),
			totals: {
				answers: sum(groups, "answers"),
				inputTokens: sum(groups, "inputTokens"),
				outputTokens: sum(groups, "outputTokens"),
				costUsd:
					priced.length > 0 ? priced.reduce((total, m) => total + (m.costUsd ?? 0), 0) : null,
				unpricedAnswers: models
					.filter((model) => model.costUsd === null)
					.reduce((total, model) => total + model.answers, 0),
			},
			daily: Array.from({ length: days }, (_, index) => {
				const day = new Date(since.getTime() + index * DAY_MS).toISOString().slice(0, 10);
				const ofDay = groups.filter((group) => group.day === day);
				return {
					day,
					answers: sum(ofDay, "answers"),
					inputTokens: sum(ofDay, "inputTokens"),
					outputTokens: sum(ofDay, "outputTokens"),
				};
			}),
			models,
		};
	}
}

function startOfUtcDay(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function sum(groups: UsageGroup[], key: "answers" | "inputTokens" | "outputTokens"): number {
	return groups.reduce((total, group) => total + group[key], 0);
}

function byModel(groups: UsageGroup[], prices: ModelPrices): Usage["models"] {
	const merged = new Map<string, Omit<UsageGroup, "day">>();
	for (const { day: _day, ...group } of groups) {
		const key = [group.chatModel, group.promptVersion, group.embeddingModel].join("\u0000");
		const current = merged.get(key);
		merged.set(
			key,
			current
				? {
						...current,
						answers: current.answers + group.answers,
						inputTokens: current.inputTokens + group.inputTokens,
						outputTokens: current.outputTokens + group.outputTokens,
					}
				: group,
		);
	}
	return [...merged.values()]
		.map((model) => {
			const price = prices[model.chatModel];
			return Object.assign(model, { costUsd: price ? estimateCostUsd(model, price) : null });
		})
		.toSorted((a, b) => b.answers - a.answers);
}
