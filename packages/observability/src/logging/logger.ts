import { trace } from "@opentelemetry/api";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
export type LogFormat = "json" | "pretty";
export type LogFields = Record<string, unknown>;
/** Where formatted lines go; defaults to the console method matching the level. */
export type LogSink = (line: string, level: LogLevel) => void;

export interface Logger {
	debug(message: string, fields?: LogFields): void;
	info(message: string, fields?: LogFields): void;
	warn(message: string, fields?: LogFields): void;
	error(message: string, fields?: LogFields): void;
	/** A logger that adds `fields` to every line. */
	child(fields: LogFields): Logger;
}

export type LoggerOptions = {
	service: string;
	level?: LogLevel;
	format?: LogFormat;
	fields?: LogFields;
	sink?: LogSink;
	now?: () => Date;
};

const LEVELS: Record<LogLevel, number> = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };

const consoleSink: LogSink = (line, level) => {
	if (level === "ERROR") console.error(line);
	else if (level === "WARN") console.warn(line);
	else if (level === "DEBUG") console.debug(line);
	else console.info(line);
};

/** Errors become `{ name, message, stack }` so they survive JSON. */
function serialize(value: unknown): unknown {
	return value instanceof Error
		? { name: value.name, message: value.message, stack: value.stack }
		: value;
}

/** Structured logger. Lines carry the active trace and span ids so logs join traces. */
export function createLogger({
	service,
	level = "INFO",
	format = "pretty",
	fields = {},
	sink = consoleSink,
	now = () => new Date(),
}: LoggerOptions): Logger {
	const min = LEVELS[level];

	function log(lineLevel: LogLevel, message: string, extra: LogFields = {}) {
		if (LEVELS[lineLevel] < min) return;
		const spanContext = trace.getActiveSpan()?.spanContext();
		const all: LogFields = {
			...fields,
			...extra,
			...(spanContext ? { traceId: spanContext.traceId, spanId: spanContext.spanId } : {}),
		};
		const time = now().toISOString();
		if (format === "json") {
			const record: LogFields = { time, level: lineLevel, service, msg: message };
			for (const [key, value] of Object.entries(all)) record[key] = serialize(value);
			sink(JSON.stringify(record), lineLevel);
			return;
		}
		const pairs = Object.entries(all)
			.map(([key, value]) => {
				const shown = serialize(value);
				return `${key}=${typeof shown === "string" ? shown : JSON.stringify(shown)}`;
			})
			.join(" ");
		sink(
			`${time} ${lineLevel.padEnd(5)} [${service}] ${message}${pairs ? ` ${pairs}` : ""}`,
			lineLevel,
		);
	}

	return {
		debug: (message, extra) => log("DEBUG", message, extra),
		info: (message, extra) => log("INFO", message, extra),
		warn: (message, extra) => log("WARN", message, extra),
		error: (message, extra) => log("ERROR", message, extra),
		child: (extra) =>
			createLogger({ service, level, format, fields: { ...fields, ...extra }, sink, now }),
	};
}
