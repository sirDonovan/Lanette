import net = require("net");

const args = process.argv.slice(2);
if (args.length < 1) {
	console.log("Usage: node repl.js [host:port]");
	process.exit(1);
}

process.on('uncaughtException', error => {
	console.log(error);
});

const [host, port] = args[0].split(":");

const socket = net.connect(parseInt(port), host);

process.stdin.pipe(socket);
socket.pipe(process.stdout);

socket.on("connect", () => {
	process.stdin.setRawMode(true);
});

socket.on("close", () => {
	process.exit(0);
});

process.on("exit", () => {
	socket.end();
});
