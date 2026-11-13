import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Pool } from "pg";

export type PostgresCheckpointerOptions = {
	connectionString: string;
	/** Postgres schema for LangGraph's checkpoint tables (created by `setup`). */
	schema?: string;
	/**
	 * A pooled connection that drops while idle (Postgres restarted, network cut). Without a
	 * listener `pg` rethrows it and the process exits; the pool reconnects on the next query.
	 */
	onError: (error: Error) => void;
};

export type PostgresCheckpointer = {
	saver: BaseCheckpointSaver;
	/** Create or migrate the checkpoint tables. Safe to call on every start. */
	setup(): Promise<void>;
	close(): Promise<void>;
};

/** LangGraph checkpoints in Postgres (`@synapse/orchestration` graphs resume from them). */
export function createPostgresCheckpointer({
	connectionString,
	schema = "langgraph",
	onError,
}: PostgresCheckpointerOptions): PostgresCheckpointer {
	const pool = new Pool({ connectionString });
	pool.on("error", onError);
	const saver = new PostgresSaver(pool, undefined, { schema });
	return { saver, setup: () => saver.setup(), close: () => saver.end() };
}
