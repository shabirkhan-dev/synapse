import { AUDIT_ACTIONS, type AuditLog } from "@synapse/audit";
import {
	createInputPolicy,
	createOutputGuard,
	createToolPolicy,
	type InputPolicy,
	type OutputGuard,
	sanitizePassages,
	sanitizeUntrustedText,
	type ToolPolicy,
} from "@synapse/guardrails";
import { redactSecrets } from "@synapse/security";

import type { GuardrailsConfig } from "@/config";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { RequestContext } from "@/shared/types/app-types";

import {
	CHAT_ALLOWED_TOOLS,
	GUARDRAILS_ERROR_CODES,
	GUARDRAILS_MESSAGES,
	type GuardedSurface,
} from "../constants/guardrails.constants";

/**
 * Policy checks around every model call: user input before retrieval, untrusted text (passages,
 * tool results, facts) before it reaches the model, and answers before they are returned. Blocks
 * and flags are audited; the blocked text itself is not stored.
 */
export class GuardrailsService {
	private readonly input: InputPolicy;
	private readonly output: OutputGuard;
	private readonly tools: ToolPolicy;

	constructor(
		config: GuardrailsConfig,
		private readonly audit: AuditLog,
	) {
		this.input = createInputPolicy({
			maxChars: config.maxInputChars,
			blockedTerms: config.blockedTerms,
		});
		this.output = createOutputGuard({ redactSecrets });
		this.tools = createToolPolicy(CHAT_ALLOWED_TOOLS);
	}

	/** Throws `422 GUARDRAILS_INPUT_BLOCKED` (and audits it) when `text` breaks the input policy. */
	async checkInput(
		ownerId: string,
		text: string,
		surface: GuardedSurface,
		context: RequestContext,
	) {
		const verdict = this.input.check(text);
		if (verdict.allowed) {
			return;
		}
		await this.record(ownerId, AUDIT_ACTIONS.GUARDRAILS_INPUT_BLOCKED, context, {
			surface,
			reason: verdict.reason,
			length: text.length,
		});
		throw new AppError({
			statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
			code: GUARDRAILS_ERROR_CODES.INPUT_BLOCKED,
			message:
				verdict.reason === "too_long"
					? GUARDRAILS_MESSAGES.INPUT_TOO_LONG(verdict.limit)
					: GUARDRAILS_MESSAGES.INPUT_BLOCKED,
			details: [{ reason: verdict.reason }],
		});
	}

	/** Neutralize instruction-like text in retrieved or tool-returned passages; audits flags. */
	async sanitizePassages<TPassage extends { id: string; content: string }>(
		ownerId: string,
		passages: TPassage[],
		surface: GuardedSurface,
		context: RequestContext,
	): Promise<TPassage[]> {
		const result = sanitizePassages(passages);
		if (result.flagged.length > 0) {
			await this.record(ownerId, AUDIT_ACTIONS.GUARDRAILS_PASSAGES_FLAGGED, context, {
				surface,
				passageIds: result.flagged.map((flag) => flag.id),
				matches: result.flagged.flatMap((flag) => flag.matches).slice(0, 10),
			});
		}
		return result.passages;
	}

	/** A fact to remember must not carry instructions (memory poisoning); throws 422 and audits. */
	async checkFact(ownerId: string, fact: string, context: RequestContext) {
		await this.checkInput(ownerId, fact, "memory.fact", context);
		const sanitized = sanitizeUntrustedText(fact);
		if (!sanitized.flagged) {
			return;
		}
		await this.record(ownerId, AUDIT_ACTIONS.GUARDRAILS_INPUT_BLOCKED, context, {
			surface: "memory.fact",
			reason: "instructions",
			matches: sanitized.matches.slice(0, 10),
		});
		throw new AppError({
			statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
			code: GUARDRAILS_ERROR_CODES.INPUT_BLOCKED,
			message: GUARDRAILS_MESSAGES.INSTRUCTIONS_IN_FACT,
			details: [{ reason: "instructions" }],
		});
	}

	/** Remove leaked secrets from an answer; audits when something was removed. */
	async guardAnswer(ownerId: string, text: string, context: RequestContext): Promise<string> {
		const checked = this.output.check(text);
		if (checked.redacted) {
			await this.record(ownerId, AUDIT_ACTIONS.GUARDRAILS_OUTPUT_REDACTED, context, {});
		}
		return checked.text;
	}

	/** Only allowed tools reach the model. */
	allowedTools<TTools extends Record<string, unknown>>(tools: TTools): Partial<TTools> {
		return this.tools.filter(tools).tools;
	}

	private async record(
		ownerId: string,
		action: string,
		context: RequestContext,
		data: Record<string, unknown>,
	) {
		await this.audit.record({
			ownerId,
			actorId: ownerId,
			action,
			subjectType: "guardrail",
			subjectId: null,
			requestId: context.requestId,
			data,
			provenance: null,
		});
	}
}
