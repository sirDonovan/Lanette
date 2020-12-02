import repl = require('repl');

import type { Socket } from 'net';

export const start = (socket: Socket): void => {
	console.log("REPL client connected");

	const replServer = repl.start({
		input: socket,
		output: socket,
		preview: false,
		terminal: true,
	});

	socket.on("error", e => {
		console.log("REPL socket error: " + e.message);
	});

	replServer.on("exit", () => {
		console.log("REPL client disconnected");
		socket.end();
	});
};