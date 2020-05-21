const fs = require('fs');
const path = require('path');

const configFile = path.join(__dirname, 'src', 'config.ts');
if (!fs.existsSync(configFile)) {
	console.log("Creating a default config.ts in the src folder (you need to edit this)...");
	fs.writeFileSync(configFile, fs.readFileSync(path.join(__dirname, 'src', 'config-example.ts')));
}

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
