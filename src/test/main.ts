import fs = require('fs');
import Mocha = require('mocha');
import path = require('path');
import stream = require('stream');

import { testOptions } from './test-tools';

const rootFolder = path.resolve(__dirname, '..', '..');
const modulesDir = path.join(__dirname, 'modules');
const moduleTests = fs.readdirSync(modulesDir).filter(x => x.endsWith('.js'));
const pokemonShowdownTestFile = 'pokemon-showdown.js';

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
		// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-call
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

		const loadGames = modulesToTest.includes('games.js');
		if (loadGames) {
			Games.loadFormats();
		}

		if (loadGames || modulesToTest.includes('dex.js') || modulesToTest.includes(pokemonShowdownTestFile) ||
			modulesToTest.includes('tournaments.js')) {
			await Dex.loadAllData();
		}

		if (loadGames) {
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
