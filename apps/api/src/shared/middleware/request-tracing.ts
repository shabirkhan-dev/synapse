import { type Logger, SpanStatusCode, withSpan } from "@synapse/observability";
import { createMiddleware } from "hono/factory";
import { routePath } from "hono/route";

import { HTTP_STATUS } from "../constants/http-status";
import type { AppBindings } from "../types/app-types";

/**
 * One span per request (named by route pattern, e.g. `POST /api/v1/rag/query`, so ids in paths do
 * not explode cardinality) and one structured log line. Spans started while handling the request
 * (retrieval, LLM calls) become its children.
 */
export function createRequestTracing(logger: Logger) {
	return createMiddleware<AppBindings>(async (c, next) => {
		const started = performance.now();
		await withSpan(
			`${c.req.method} ${c.req.path}`,
			{
				"http.request.method": c.req.method,
				"url.path": c.req.path,
				"synapse.request_id": c.get("requestId"),
			},
			async (span) => {
				await next();
				const route = routePath(c, -1);
				span.updateName(`${c.req.method} ${route}`);
				span.setAttribute("http.route", route);
				span.setAttribute("http.response.status_code", c.res.status);
				if (c.res.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
					span.setStatus({ code: SpanStatusCode.ERROR });
				}
				logger.info("request", {
					method: c.req.method,
					path: c.req.path,
					route,
					status: c.res.status,
					durationMs: Math.round(performance.now() - started),
					requestId: c.get("requestId"),
				});
			},
		);
	});
}
