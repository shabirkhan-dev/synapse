/** Claims apps/nest-api puts in its access tokens (sub = user id, sid = session id). */
export type AuthUser = {
	sub: string;
	sid: string;
};
