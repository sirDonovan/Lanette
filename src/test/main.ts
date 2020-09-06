import fs = require('fs');
import Mocha = require('mocha');
import path = require('path');
import stream = require('stream');

import { testOptions } from './test-tools';

const rootFolder = path.resolve(__dirname, '..', '..');
const modulesDir = path.join(__dirname, 'modules');
const moduleTests = fs.readdirSync(modulesDir).filter(x => x.endsWith('.js'));
const pokemonShowdownTestFile = 'pokemon-showdown.js';
const nonTrivialGameLoadTime = 100;

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
			console.log("Loading dex data for tests...");
			Dex.loadAllData();
			console.log("Loaded dex data");
		}

		if (loadGames) {
			console.log("Loading game data for tests...");
			let formats: string[];
			if (testOptions.games) {
				formats = testOptions.games.split(',');
			} else {
				formats = Object.keys(Games.formats);
			}

			const unflaggedGames: string[] = [];
			for (const i of formats) {
				const format = Games.getExistingFormat(i);
				if (format.class.loadData) {
					const start = process.hrtime();
					format.class.loadData(mochaRoom);
					const end = process.hrtime(start);
					const loadTime = (end[0] * 1000000000 + end[1]) / 1000000;
					if (loadTime > nonTrivialGameLoadTime && !format.nonTrivialLoadData) {
						unflaggedGames.push("Format " + format.name + " should be flagged 'nonTrivialLoadData' (" +
							loadTime + "ms load time)");
					}
					format.class.loadedData = true;
				}
			}

			if (unflaggedGames.length) {
				for (const game of unflaggedGames) {
					console.log(game);
				}
				throw new Error("Missing 'nonTrivialLoadData' flag" + (unflaggedGames.length > 1 ? "s" : ""));
			}

			console.log("Loaded game data");
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
