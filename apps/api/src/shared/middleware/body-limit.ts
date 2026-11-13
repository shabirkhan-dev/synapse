import { bodyLimit } from "hono/body-limit";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { RESPONSE_MESSAGES } from "@/shared/constants/response-messages";
import { AppError } from "@/shared/errors/app-error";

/**
 * The most any route accepts (a 2 MiB document upload). Routes set tighter limits of their own;
 * this cap stops every other write route from buffering Bun's 128 MiB default.
 */
export const REQUEST_MAX_BODY_BYTES = 2 * 1024 * 1024;

export const requestBodyLimit = bodyLimit({
	maxSize: REQUEST_MAX_BODY_BYTES,
	onError: () => {
		throw new AppError({
			statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
			code: ERROR_CODES.PAYLOAD_TOO_LARGE,
			message: RESPONSE_MESSAGES.ERRORS.BODY_TOO_LARGE,
		});
	},
});
