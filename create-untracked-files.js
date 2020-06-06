const fs = require('fs');
const path = require('path');

const configFile = path.join(__dirname, 'src', 'config.ts');
if (!fs.existsSync(configFile)) {
	console.log("Creating a default config.ts in the src folder (you need to edit this)...");
	fs.writeFileSync(configFile, fs.readFileSync(path.join(__dirname, 'src', 'config-example.ts')));
}

const pokedexMiniFile = path.join(__dirname, 'data', 'pokedex-mini.js');
if (!fs.existsSync(pokedexMiniFile)) {
	fs.writeFileSync(pokedexMiniFile, fs.readFileSync(path.join(__dirname, 'data', 'pokedex-mini-base.js')));
}

const pokedexMiniBWFile = path.join(__dirname, 'data', 'pokedex-mini-bw.js');
if (!fs.existsSync(pokedexMiniBWFile)) {
	fs.writeFileSync(pokedexMiniBWFile, fs.readFileSync(path.join(__dirname, 'data', 'pokedex-mini-bw-base.js')));
}
