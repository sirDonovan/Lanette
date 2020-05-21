import fs = require('fs');
import Mocha = require('mocha');
import path = require('path');
import stream = require('stream');

import { testOptions } from './test-tools';

const rootFolder = path.resolve(__dirname, '..', '..');
const modulesDir = path.join(__dirname, 'modules');
const moduleTests = fs.readdirSync(modulesDir);
const configFile = path.join(rootFolder, 'built', 'config.js');
const pokedexMiniFile = path.join(rootFolder, 'data', 'pokedex-mini.js');
const pokedexMiniBWFile = path.join(rootFolder, 'data', 'pokedex-mini-bw.js');
const pokemonShowdownTestFile = 'pokemon-showdown.js';

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
	// @ts-expect-error
	fs[method] = noOp;
	// @ts-expect-error
	fs[method + 'Sync'] = noOp;
}

Object.assign(fs, {createWriteStream() {
	return new stream.Writable();
}});

module.exports = async(inputOptions: Dict<string>): Promise<void> => {
	for (const i in inputOptions) {
		testOptions[i] = inputOptions[i];
	}

	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		await require(path.join(rootFolder, 'built', 'app.js'))();
		clearInterval(Storage.globalDatabaseExportInterval);

		const mochaRoom = Rooms.add('mocha');
		mochaRoom.title = 'Mocha';

		let modulesToTest: string[] | undefined;
		if (testOptions.modules) {
			modulesToTest = testOptions.modules.split(',').map(x => x.trim() + '.js');
		} else {
			modulesToTest = moduleTests.concat(pokemonShowdownTestFile);
		}

		if (modulesToTest.includes('games.js')) {
			console.log("Loading game data for tests...");
			for (const i in Games.formats) {
				const game = Games.createGame(mochaRoom, Games.getExistingFormat(i));
				game.deallocate(true);
			}
		}

		const mocha = new Mocha({
			reporter: 'dot',
			ui: 'bdd',
		});

		if (modulesToTest.includes(pokemonShowdownTestFile)) mocha.addFile(path.join(__dirname, pokemonShowdownTestFile));

		for (const moduleTest of moduleTests) {
			if (modulesToTest.includes(moduleTest)) mocha.addFile(path.join(modulesDir, moduleTest));
		}

		mocha.run(failures => {
			Games.unrefWorkers();
			Storage.unrefWorkers();

			process.exit(failures === 0 ? 0 : 1);
		});
	} catch (e) {
		console.log(e);
		process.exit(1);
	}
};
