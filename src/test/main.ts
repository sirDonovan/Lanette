import fs = require('fs');
import path = require('path');
import stream = require('stream');

const rootFolder = path.resolve(__dirname, '..', '..');
const modulesDir = path.join(__dirname, 'modules');
const moduleTests = fs.readdirSync(modulesDir);
const configFile = path.join(rootFolder, 'built', 'config.js');
const pokedexMiniFile = path.join(rootFolder, 'data', 'pokedex-mini.js');
const pokedexMiniBWFile = path.join(rootFolder, 'data', 'pokedex-mini-bw.js');

// create needed files if running on Travis CI
if (!fs.existsSync(configFile)) {
	fs.writeFileSync(configFile, fs.readFileSync(path.join(rootFolder, 'built', 'config-example.js')));
}
if (!fs.existsSync(pokedexMiniFile)) {
	fs.writeFileSync(pokedexMiniFile, fs.readFileSync(path.join(rootFolder, 'data', 'pokedex-mini-base.js')));
}
if (!fs.existsSync(pokedexMiniBWFile)) {
	fs.writeFileSync(pokedexMiniBWFile, fs.readFileSync(path.join(rootFolder, 'data', 'pokedex-mini-bw-base.js')));
}

// tslint:disable-next-line no-empty
const noOp = () => {};
const methodsToNoOp = ['appendFile', 'chmod', 'rename', 'rmdir', 'symlink', 'unlink', 'watchFile', 'writeFile'];
for (let i = 0; i < methodsToNoOp.length; i++) {
	// @ts-ignore
	fs[methodsToNoOp[i]] = noOp;
	// @ts-ignore
	fs[methodsToNoOp[i] + 'Sync'] = noOp;
}

Object.assign(fs, {createWriteStream() {
	return new stream.Writable();
}});

try {
	// tslint:disable-next-line no-var-requires
	require(path.join(rootFolder, 'built', 'app.js'));
	clearInterval(Storage.globalDatabaseExportInterval);

	// tslint:disable-next-line no-var-requires
	require(path.join(__dirname, 'pokemon-showdown'));

	console.log("Loading data for tests...");
	Dex.loadData();

	Rooms.add('mocha');
	Rooms.get('mocha')!.title = 'Mocha';

	for (let i = 0; i < moduleTests.length; i++) {
		// tslint:disable-next-line no-var-requires
		require(path.join(modulesDir, moduleTests[i]));
	}
} catch (e) {
	console.log(e);
	process.exit(1);
}
