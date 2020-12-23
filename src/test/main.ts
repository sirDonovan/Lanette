import fs = require('fs');
import Mocha = require('mocha');
import path = require('path');
import stream = require('stream');

import { testOptions } from './test-tools';

const rootFolder = path.resolve(__dirname, '..', '..');
const modulesDir = path.join(__dirname, 'modules');
const moduleTests = fs.readdirSync(modulesDir).filter(x => x.endsWith('.js'));
const pokemonShowdownTestFile = 'pokemon-showdown.js';
const nonTrivialGameLoadTime = 200;

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

module.exports = (inputOptions: Dict<string>): void => {
	for (const i in inputOptions) {
		testOptions[i] = inputOptions[i];
	}

	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-call
		require(path.join(rootFolder, 'built', 'app.js'))();
		clearInterval(Storage.globalDatabaseExportInterval);

		const mochaRoom = Rooms.add('mocha');
		mochaRoom.setTitle('Mocha');

		let modulesToTest: string[];
		if (testOptions.modules) {
			modulesToTest = testOptions.modules.split(',').map(x => x.trim() + '.js');
		} else {
			modulesToTest = moduleTests.concat(pokemonShowdownTestFile);
		}

		const loadGames = modulesToTest.includes('games.js');
		const loadWorkers = modulesToTest.includes('workers.js');

		if (!loadGames && loadWorkers) {
			console.log("Loading worker data for tests...");
			Games.workers.parameters.init();
			Games.workers.portmanteaus.init();
			console.log("Loaded worker data");
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

		const mochaRunsOption = testOptions.mochaRuns ? parseInt(testOptions.mochaRuns) : 0;
		const maxMochaRuns = !isNaN(mochaRunsOption) ? Math.max(1, mochaRunsOption) : 1;

		const mocha = new Mocha({
			reporter: maxMochaRuns === 1 ? 'dot' : 'min',
			ui: 'bdd',
		});

		if (modulesToTest.includes(pokemonShowdownTestFile)) mocha.addFile(path.join(__dirname, pokemonShowdownTestFile));

		for (const moduleTest of moduleTests) {
			if (modulesToTest.includes(moduleTest)) mocha.addFile(path.join(modulesDir, moduleTest));
		}

		let mochaRuns = 0;

		const runMocha = () => {
			mocha.run(failures => {
				if (failures) process.exit(1);

				mochaRuns++;
				if (mochaRuns === maxMochaRuns) {
					Games.unrefWorkers();
					process.exit(failures ? 1 : 0);
				}

				mocha.unloadFiles();
				runMocha();
			});
		};

		runMocha();
	} catch (e) {
		console.log(e);
		process.exit(1);
	}
};
