const path = require('path');

require(path.join(__dirname, 'create-untracked-files.js'));

require(path.join(__dirname, 'build.js'))(async() => {
	await require(path.join(__dirname, 'built', 'app.js'))();

	console.log("Loading dex data...");
	Dex.loadAllData();
	console.log("Loaded dex data");

	Games.loadFormats();

	process.on('uncaughtException', error => {
		console.log(error);
	});

	Client.connect();
}, () => {
	process.exit(1);
});
