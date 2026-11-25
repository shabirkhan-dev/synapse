import { bodyLimit } from "hono/body-limit";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";

import { AUTH_MAX_BODY_BYTES, AUTH_MESSAGES } from "../constants/auth.constants";

/** Sign-in bodies are tiny; anything bigger is refused before it is parsed. */
export const smallBody = bodyLimit({
	maxSize: AUTH_MAX_BODY_BYTES,
	onError: () => {
		throw new AppError({
			statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
			code: ERROR_CODES.PAYLOAD_TOO_LARGE,
			message: AUTH_MESSAGES.BODY_TOO_LARGE,
		});
	},
});
