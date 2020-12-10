const net = require('net');
const path = require('path');

require(path.join(__dirname, 'create-untracked-files.js'));

require(path.join(__dirname, 'build.js'))(async() => {
	await require(path.join(__dirname, 'built', 'app.js'))();

	console.log("Loading dex data...");
	Dex.loadAllData();
	console.log("Loaded dex data");

	Games.loadFormats();

	if (Config.repl && Config.repl.enabled) {
		const replPort = Config.repl.port || 3001;
		net.createServer(socket => {
			require(path.join(__dirname, 'built', 'repl.js')).start(socket);
		}).listen(replPort, () => console.log("REPL server listening on port " + replPort));
	}

	process.on('uncaughtException', error => {
		console.log(error);
		Tools.logError(error);
	});

	Client.connect();
}, () => {
	process.exit(1);
});
