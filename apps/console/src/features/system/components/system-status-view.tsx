import { Badge } from "@synapse/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@synapse/ui/components/table";

import { CIRCUIT_LABELS, JOB_STATES } from "../constants/system.constants";
import type { Circuit, SystemStatus } from "../types/system.types";

const count = new Intl.NumberFormat("en");
const when = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

function uptime(seconds: number): string {
	const days = Math.floor(seconds / 86_400);
	const hours = Math.floor((seconds % 86_400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	if (days > 0) return `${days} d ${hours} h`;
	if (hours > 0) return `${hours} h ${minutes} min`;
	return `${minutes} min`;
}

function circuitText(circuit: Circuit): {
	label: string;
	detail: string;
	tone: "ok" | "bad" | "wait";
} {
	if (circuit.state === "closed") {
		return { label: "Working", detail: "Calls go through", tone: "ok" };
	}
	if (circuit.state === "half-open") {
		return { label: "Testing", detail: "One trial call decides", tone: "wait" };
	}
	return {
		label: "Failing fast",
		detail: `Calls stop at once; the next call after ${Math.round(circuit.resetAfterMs / 1000)} s is a trial`,
		tone: "bad",
	};
}

const TONE = { ok: "secondary", wait: "outline", bad: "destructive" } as const;

function Tile({ label, value, detail }: { label: string; value: string; detail: string }) {
	return (
		<Card>
			<CardContent className="flex flex-col gap-1">
				<span className="text-xs text-muted-foreground">{label}</span>
				<span className="text-lg font-semibold tabular-nums">{value}</span>
				<span className="text-xs text-muted-foreground">{detail}</span>
			</CardContent>
		</Card>
	);
}

/** One status reading: summary tiles, then dependencies, jobs, the index and tracing. */
export function SystemStatusView({ status }: { status: SystemStatus }) {
	const failing = status.circuits.filter((circuit) => circuit.state !== "closed").length;
	const failedJobs = (status.jobs.counts ?? [])
		.filter((row) => row.state === "failed")
		.reduce((total, row) => total + row.count, 0);
	const queues = [...new Set((status.jobs.counts ?? []).map((row) => row.queue))];
	const jobCount = (queue: string, state: string) =>
		status.jobs.counts?.find((row) => row.queue === queue && row.state === state)?.count ?? 0;
	const outOfDate = status.index.chunkModels
		.filter((row) => !row.current)
		.reduce((total, row) => total + row.chunks, 0);

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Tile
					label="Database"
					value={status.database.ok ? "Reachable" : "Unreachable"}
					detail={
						status.database.latencyMs === null
							? "Readiness checks fail until it is back"
							: `Answered in ${status.database.latencyMs} ms`
					}
				/>
				<Tile
					label="Model and email providers"
					value={failing === 0 ? "All working" : `${failing} failing`}
					detail={`${status.circuits.length} circuit breakers in this API process`}
				/>
				<Tile
					label="Background jobs"
					value={status.jobs.counts === null ? "Not started" : `${count.format(failedJobs)} failed`}
					detail={
						status.jobs.counts === null
							? "The worker creates its queues when it first starts"
							: `${queues.length} ${queues.length === 1 ? "queue" : "queues"}`
					}
				/>
				<Tile
					label="API process"
					value={`Up ${uptime(status.uptimeSeconds)}`}
					detail={`Checked ${when.format(new Date(status.checkedAt))}`}
				/>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Circuit breakers</CardTitle>
					<CardDescription>
						After repeated failures a dependency fails fast instead of making people wait. These are
						this API process's own; other replicas keep their own state.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Dependency</TableHead>
								<TableHead>State</TableHead>
								<TableHead>Since</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{status.circuits.map((circuit) => {
								const text = circuitText(circuit);
								return (
									<TableRow key={circuit.name}>
										<TableCell>{CIRCUIT_LABELS[circuit.name] ?? circuit.name}</TableCell>
										<TableCell>
											<span className="flex flex-wrap items-center gap-2">
												<Badge variant={TONE[text.tone]}>{text.label}</Badge>
												<span className="text-xs text-muted-foreground">{text.detail}</span>
											</span>
										</TableCell>
										<TableCell className="whitespace-nowrap text-muted-foreground">
											{circuit.since ? when.format(new Date(circuit.since)) : "Since start"}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Background jobs</CardTitle>
						<CardDescription>Queues the worker runs (pg-boss), by state.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{status.jobs.counts === null ? (
							<p className="text-xs text-muted-foreground">
								No queues yet: the worker creates them when it first starts.
							</p>
						) : queues.length === 0 ? (
							<p className="text-xs text-muted-foreground">No jobs have run yet.</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Queue</TableHead>
										{JOB_STATES.map((state) => (
											<TableHead key={state} className="text-right capitalize">
												{state}
											</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody className="tabular-nums">
									{queues.map((queue) => (
										<TableRow key={queue}>
											<TableCell className="font-mono text-xs">{queue}</TableCell>
											{JOB_STATES.map((state) => (
												<TableCell
													key={state}
													className={`text-right ${state === "failed" && jobCount(queue, state) > 0 ? "font-medium text-destructive" : ""}`}
												>
													{count.format(jobCount(queue, state))}
												</TableCell>
											))}
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
						{status.jobs.checkpoints.length > 0 ? (
							<div className="flex flex-col gap-2">
								<h3 className="text-sm font-medium">Latest checkpoints</h3>
								<ul className="flex flex-col gap-2 text-xs">
									{status.jobs.checkpoints.map((checkpoint) => (
										<li key={checkpoint.jobId} className="flex flex-col gap-0.5">
											<span>
												<span className="font-mono">{checkpoint.queue}</span>{" "}
												<span className="text-muted-foreground">
													· {when.format(new Date(checkpoint.updatedAt))}
												</span>
											</span>
											<span className="break-all font-mono text-muted-foreground">
												{JSON.stringify(checkpoint.state)}
											</span>
										</li>
									))}
								</ul>
							</div>
						) : null}
					</CardContent>
				</Card>

				<div className="flex flex-col gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Index</CardTitle>
							<CardDescription>
								{outOfDate === 0
									? "Every chunk in this workspace uses the current embedding model."
									: `${count.format(outOfDate)} chunks use an older model: meaning search skips them until the worker re-embeds them.`}
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 text-xs">
							<p>
								<span className="text-muted-foreground">Embedding model </span>
								<span className="font-mono text-xs">{status.index.embeddingModel}</span>
							</p>
							<p>
								<span className="text-muted-foreground">Chunker </span>
								<span className="font-mono text-xs break-all">{status.index.chunkerVersion}</span>
							</p>
							{status.index.chunkModels.length > 0 ? (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Model that embedded them</TableHead>
											<TableHead className="text-right">Chunks</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody className="tabular-nums">
										{status.index.chunkModels.map((row) => (
											<TableRow key={row.embeddingModel ?? "none"}>
												<TableCell>
													<span className="flex flex-wrap items-center gap-2">
														<span className="font-mono text-xs">
															{row.embeddingModel ?? "Unknown (older chunks)"}
														</span>
														{row.current ? <Badge variant="secondary">Current</Badge> : null}
													</span>
												</TableCell>
												<TableCell className="text-right">{count.format(row.chunks)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							) : null}
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Traces</CardTitle>
						</CardHeader>
						<CardContent className="text-xs">
							{status.traces.destination === "none" ? (
								<p className="text-muted-foreground">
									Not exported. Set the Langfuse keys or an OTLP endpoint to keep traces.
								</p>
							) : (
								<p>
									Sent to{" "}
									{status.traces.destination === "langfuse" ? "Langfuse" : "an OTLP collector"} at{" "}
									<span className="font-mono text-xs">{status.traces.host}</span>
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
