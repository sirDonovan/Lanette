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

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noOp = (): void => {};
const methodsToNoOp = ['appendFile', 'chmod', 'rename', 'rmdir', 'symlink', 'unlink', 'watchFile', 'writeFile'];
for (const method of methodsToNoOp) {
	// @ts-ignore
	fs[method] = noOp;
	// @ts-ignore
	fs[method + 'Sync'] = noOp;
}

Object.assign(fs, {createWriteStream() {
	return new stream.Writable();
}});

try {
	require(path.join(rootFolder, 'built', 'app.js'));
	clearInterval(Storage.globalDatabaseExportInterval);

	require(path.join(__dirname, 'pokemon-showdown'));

	const mochaRoom = Rooms.add('mocha');
	mochaRoom.title = 'Mocha';

	console.log("Loading data for tests...");
	Dex.loadData();
	for (const i in Games.formats) {
		const game = Games.createGame(mochaRoom, Games.getExistingFormat(i));
		game.deallocate(true);
	}

	for (const moduleTest of moduleTests) {
		require(path.join(modulesDir, moduleTest));
	}
} catch (e) {
	console.log(e);
	process.exit(1);
}
