const net = require('net');
const path = require('path');

require(path.join(__dirname, 'create-untracked-files.js'));

module.exports = (async () => {
	await require(path.join(__dirname, 'build.js'))().catch(e => {
		console.log(e);
		process.exit(1);
	});

	require(path.join(__dirname, 'build', 'app.js'))();

	if (Config.repl && Config.repl.enabled) {
		const replPort = Config.repl.port || 3001;
		net.createServer(socket => {
			require(path.join(__dirname, 'build', 'repl.js')).start(socket);
		}).listen(replPort, () => console.log("REPL server listening on port " + replPort));
	}

	process.on('uncaughtException', error => {
		console.log(error);
		Tools.logError(error, "process.on('uncaughtException')");
	});

	if (require.main === module) {
		Client.connect();
	}
})();
