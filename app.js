const path = require('path');

require(path.join(__dirname, 'create-untracked-files.js'));

require(path.join(__dirname, 'build.js'))({}, async() => {
	await require(path.join(__dirname, 'built', 'app.js'))();

	await Dex.loadAllData();
	Games.loadFormats();

	process.on('uncaughtException', error => {
		console.log(error);
	});

	Client.connect();
}, () => {
	process.exit(1);
});
