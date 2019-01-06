const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

const PokemonShowdown = path.join(__dirname, 'Pokemon-Showdown');
if (!fs.existsSync(PokemonShowdown)) {
	console.log("Setting up Pokemon-Showdown folder...");
	child_process.execSync('git clone https://github.com/Zarel/Pokemon-Showdown.git');
} else {
	console.log("Updating Pokemon-Showdown files...");
	process.chdir(PokemonShowdown);
	child_process.execSync('git pull');
	process.chdir(__dirname);
}

const configFile = path.join(__dirname, 'src', 'config.ts');
if (!fs.existsSync(configFile)) {
	console.log("Creating a default config.ts in the src folder (you need to edit this)...");
	fs.writeFileSync(configFile, fs.readFileSync(path.join(__dirname, 'src', 'config-example.ts')));
}

require(path.join(__dirname, 'build.js'))(() => {
	require(path.join(__dirname, 'built', 'app.js'));
	Client.connect();
}, () => process.exit(1));
