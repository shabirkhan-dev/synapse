import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

export type PostgresCheckpointerOptions = {
	connectionString: string;
	/** Postgres schema for LangGraph's checkpoint tables (created by `setup`). */
	schema?: string;
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
}: PostgresCheckpointerOptions): PostgresCheckpointer {
	const saver = PostgresSaver.fromConnString(connectionString, { schema });
	return { saver, setup: () => saver.setup(), close: () => saver.end() };
}
