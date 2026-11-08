import { AUDIT_ACTIONS, type AuditLog } from "@synapse/audit";
import { isSynapseError } from "@synapse/core/errors";
import {
	type ApprovalRequest,
	type ApprovalStore,
	createApprovals,
	createFeedback,
	type FeedbackRating,
	type FeedbackStore,
	OVERSIGHT_ERROR_CODES,
} from "@synapse/human-oversight";
import {
	type ApprovalGatedGraph,
	type ApprovalGatedOutcome,
	type BaseCheckpointSaver,
	createApprovalGatedGraph,
} from "@synapse/orchestration";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { AuthUser, RequestContext } from "@/shared/types/app-types";

import {
	OVERSIGHT_API_ERROR_CODES,
	OVERSIGHT_MESSAGES,
	OVERSIGHT_PENDING_LIMIT,
} from "../constants/oversight.constants";

/** Every gated action runs for one owner; extra fields are the action's own input. */
export type ActionInput = { ownerId: string };

export type GatedAction<TInput extends ActionInput, TResult> = {
	/** One line for the reviewer, e.g. "Delete all 12 documents". */
	describe(input: TInput): Promise<string>;
	execute(input: TInput): Promise<TResult>;
};

export type ActionOutcome = ApprovalGatedOutcome<unknown>;

/**
 * Human approval for risky actions: starting one stores an approval request and pauses a
 * checkpointed graph run (same id); deciding stores the decision once, then resumes the run, which
 * executes the action only if approved. Until roles exist the approver is the owner.
 */
export class OversightService {
	private readonly approvals: ReturnType<typeof createApprovals>;
	private readonly feedback: ReturnType<typeof createFeedback>;
	private readonly graphs = new Map<string, ApprovalGatedGraph<ActionInput, unknown>>();

	constructor(
		approvalStore: ApprovalStore,
		feedbackStore: FeedbackStore,
		private readonly checkpointer: BaseCheckpointSaver,
		private readonly audit: AuditLog,
	) {
		this.approvals = createApprovals(approvalStore);
		this.feedback = createFeedback(feedbackStore);
	}

	/** Register an action that needs approval. Call once per action at startup. */
	registerAction<TInput extends ActionInput, TResult>(
		action: string,
		{ describe, execute }: GatedAction<TInput, TResult>,
	): void {
		const graph = createApprovalGatedGraph<TInput, TResult>({
			checkpointer: this.checkpointer,
			ports: {
				requestApproval: async ({ approvalId, input }) =>
					this.approvals.request({
						id: approvalId,
						ownerId: input.ownerId,
						action,
						summary: await describe(input),
					}),
				execute,
			},
		});
		this.graphs.set(action, graph as unknown as ApprovalGatedGraph<ActionInput, unknown>);
	}

	/** Ask for approval; nothing runs until someone approves. */
	async request<TInput extends ActionInput>(
		action: string,
		input: TInput,
		context: RequestContext = { requestId: null },
	): Promise<ApprovalRequest> {
		const approvalId = crypto.randomUUID();
		await this.graph(action).start(approvalId, input);
		const approval = await this.approvals.get(approvalId, input.ownerId);
		await this.record(AUDIT_ACTIONS.OVERSIGHT_APPROVAL_REQUESTED, approval, context, {
			action,
			summary: approval.summary,
		});
		return approval;
	}

	pending(ownerId: string): Promise<ApprovalRequest[]> {
		return this.approvals.pending(ownerId, OVERSIGHT_PENDING_LIMIT);
	}

	/**
	 * Store the decision (once), then resume the paused run. Repeating a decision is safe: if the
	 * resume failed last time, this one finishes it.
	 */
	async decide(
		id: string,
		user: AuthUser,
		{ approved, reason }: { approved: boolean; reason?: string | undefined },
		context: RequestContext = { requestId: null },
	): Promise<{ approval: ApprovalRequest; outcome: ActionOutcome }> {
		const decision = { approved, decidedBy: user.sub, ...(reason ? { reason } : {}) };
		// Read before deciding: only a new decision is an event; a repeated one (retry) is not.
		const isNewDecision =
			(await this.approvals.get(id, user.sub).catch(toAppError)).status === "pending";
		const approval = await this.approvals.decide(id, user.sub, decision).catch(toAppError);
		const outcome = await this.graph(approval.action).decide(id, decision);
		if (isNewDecision) {
			await this.record(AUDIT_ACTIONS.OVERSIGHT_APPROVAL_DECIDED, approval, context, {
				action: approval.action,
				approved,
				reason: reason ?? null,
				outcome: outcome.status,
			});
		}
		return { approval, outcome };
	}

	recordFeedback(
		ownerId: string,
		input: { requestId: string; rating: FeedbackRating; comment?: string | undefined },
	) {
		return this.feedback.record({ ownerId, ...input });
	}

	private async record(
		action: string,
		approval: ApprovalRequest,
		context: RequestContext,
		data: Record<string, unknown>,
	): Promise<void> {
		await this.audit.record({
			ownerId: approval.ownerId,
			actorId: approval.decidedBy ?? approval.ownerId,
			action,
			subjectType: "approval",
			subjectId: approval.id,
			requestId: context.requestId,
			data,
			provenance: null,
		});
	}

	private graph(action: string): ApprovalGatedGraph<ActionInput, unknown> {
		const graph = this.graphs.get(action);
		if (!graph) {
			throw new Error(`No approval-gated action registered for ${action}`);
		}
		return graph;
	}
}

function toAppError(error: unknown): never {
	if (isSynapseError(error) && error.code === OVERSIGHT_ERROR_CODES.APPROVAL_NOT_FOUND) {
		throw new AppError({
			statusCode: HTTP_STATUS.NOT_FOUND,
			code: OVERSIGHT_API_ERROR_CODES.APPROVAL_NOT_FOUND,
			message: OVERSIGHT_MESSAGES.APPROVAL_NOT_FOUND,
			cause: error,
		});
	}
	if (isSynapseError(error) && error.code === OVERSIGHT_ERROR_CODES.APPROVAL_ALREADY_DECIDED) {
		throw new AppError({
			statusCode: HTTP_STATUS.CONFLICT,
			code: OVERSIGHT_API_ERROR_CODES.APPROVAL_ALREADY_DECIDED,
			message: OVERSIGHT_MESSAGES.APPROVAL_ALREADY_DECIDED,
			cause: error,
		});
	}
	throw error;
}
