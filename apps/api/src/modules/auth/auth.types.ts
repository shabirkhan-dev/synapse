/** Claims expected in access tokens (sub = user id, sid = session id). */
export type AuthUser = {
	sub: string;
	sid: string;
};
