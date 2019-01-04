const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

if (!fs.existsSync('Pokemon-Showdown')) {
	console.log("Setting up Pokemon-Showdown folder...");
	child_process.execSync('git clone https://github.com/Zarel/Pokemon-Showdown.git');
} else {
	console.log("Updating Pokemon-Showdown files...");
	process.chdir(path.join(__dirname, 'Pokemon-Showdown'));
	child_process.execSync('git pull');
	process.chdir(__dirname);
}

if (!fs.existsSync('src/config.ts')) {
	console.log("Creating a default config.ts in the src folder (you need to edit this)...");
	fs.writeFileSync('./src/config.ts', fs.readFileSync('./src/config-example.ts'));
}

require('./build.js')(() => {
	require(path.join(__dirname, 'built/app.js'));
	Client.connect();
}, () => process.exit(1));
