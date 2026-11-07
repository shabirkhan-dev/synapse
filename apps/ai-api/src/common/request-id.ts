import { createMiddleware } from "hono/factory";

import type { AppBindings } from "./app-types";

const requestIdHeader = "x-request-id";
const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

/** Mirrors apps/nest-api: reuse a sane inbound x-request-id, otherwise mint req_<uuid>. */
export const requestId = createMiddleware<AppBindings>(async (c, next) => {
	const inbound = c.req.header(requestIdHeader);
	const id = inbound && requestIdPattern.test(inbound) ? inbound : `req_${crypto.randomUUID()}`;
	c.set("requestId", id);
	c.header(requestIdHeader, id);
	await next();
});
