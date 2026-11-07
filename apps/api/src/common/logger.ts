/**
 * Minimal leveled logger for the API. Kept local until the observability package owns logging.
 */

export type LogLevelName = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVELS: Record<LogLevelName, number> = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };

const SINKS: Record<LogLevelName, (line: string) => void> = {
	DEBUG: (line) => console.debug(line),
	INFO: (line) => console.info(line),
	WARN: (line) => console.warn(line),
	ERROR: (line) => console.error(line),
};

export interface LoggerOptions {
	prefix?: string;
	minLevel?: LogLevelName;
}

export function createLogger({ prefix, minLevel = "DEBUG" }: LoggerOptions = {}) {
	const min = LEVELS[minLevel];

	function log(level: LogLevelName, message: string, args: unknown[]) {
		if (LEVELS[level] < min) return;
		const text = args.length > 0 ? `${message} ${args.map(String).join(" ")}` : message;
		const tag = prefix ? ` [${prefix}]` : "";
		SINKS[level](`${new Date().toISOString()} ${level.padEnd(5)}${tag} ${text}`);
	}

	return {
		debug: (message: string, ...args: unknown[]) => log("DEBUG", message, args),
		info: (message: string, ...args: unknown[]) => log("INFO", message, args),
		warn: (message: string, ...args: unknown[]) => log("WARN", message, args),
		error: (message: string, ...args: unknown[]) => log("ERROR", message, args),
	};
}

export type Logger = ReturnType<typeof createLogger>;
