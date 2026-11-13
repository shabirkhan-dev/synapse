import { connect, createServer, type Socket } from "node:net";

export type DatabaseProxy = {
	/** Drop every open connection and refuse new ones: Postgres looks down to the API. */
	cut(): void;
	restore(): void;
	stop(): Promise<void>;
};

/** A TCP pass-through in front of Postgres that the chaos suite can cut and restore. */
export async function startDatabaseProxy(
	port: number,
	target: { host: string; port: number },
): Promise<DatabaseProxy> {
	const sockets = new Set<Socket>();
	let open = true;
	const track = (socket: Socket) => {
		sockets.add(socket);
		socket.on("close", () => sockets.delete(socket));
	};
	const server = createServer((client) => {
		if (!open) {
			client.destroy();
			return;
		}
		const upstream = connect(target.port, target.host);
		track(client);
		track(upstream);
		const closeBoth = () => {
			client.destroy();
			upstream.destroy();
		};
		client.on("error", closeBoth);
		upstream.on("error", closeBoth);
		client.pipe(upstream).pipe(client);
	});
	await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));

	const dropAll = () => {
		for (const socket of sockets) socket.destroy();
	};
	return {
		cut() {
			open = false;
			dropAll();
		},
		restore() {
			open = true;
		},
		stop: () =>
			new Promise<void>((resolve) => {
				dropAll();
				server.close(() => resolve());
			}),
	};
}
