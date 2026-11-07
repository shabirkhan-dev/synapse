import type { ChatGateway } from "@synapse/core/contracts";
import { SynapseError } from "@synapse/core/errors";

export const EVALUATION_ERROR_CODES = {
	CHAT_UNAVAILABLE: "EVALUATION_CHAT_UNAVAILABLE",
} as const;

/** Chat stand-in for retrieval-only evaluations: any call means the run is misconfigured. */
export function createUnavailableChat(): ChatGateway {
	return {
		info: { provider: "none", model: "none" },
		generateText: async () => {
			throw new SynapseError(
				EVALUATION_ERROR_CODES.CHAT_UNAVAILABLE,
				"Retrieval evaluations do not call a chat model",
			);
		},
	};
}
