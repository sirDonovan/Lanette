import worker_threads = require('worker_threads');

import * as tools from '../../tools';
import type {
	IUniquePairsResponse, IUniquePairsThreadData, IUniquePairsWorkerData, UniquePairsId
} from '../unique-pairs';

// eslint-disable-next-line @typescript-eslint/naming-convention
const Tools = new tools.Tools();
const workerData = worker_threads.workerData as IUniquePairsWorkerData;
const data: IUniquePairsThreadData = {
	hintKeys: [],
	hints: {},
};

let loadedData = false;
function loadData(): void {
	if (loadedData) return;

	const pokemonList = workerData.pokemonList.slice();
	pokemonList.sort((a, b) => workerData.allPossibleMoves[b.id].length - workerData.allPossibleMoves[a.id].length);

	const movePairSingleLearners: Dict<string> = {};
	const invalidPairs: Dict<boolean> = {};
	for (const pokemon of pokemonList) {
		const checked: Dict<boolean> = {};
		for (const moveA of workerData.allPossibleMoves[pokemon.id]) {
			if (moveA in workerData.bannedMoves) continue;

			for (const moveB of workerData.allPossibleMoves[pokemon.id]) {
				if (moveA === moveB || moveB in workerData.bannedMoves) continue;

				const pair = [moveA, moveB].sort().join(',');
				if (pair in checked) continue;

				checked[pair] = true;

				if (pair in invalidPairs) continue;

				if (pair in movePairSingleLearners) {
					delete movePairSingleLearners[pair];
					invalidPairs[pair] = true;
					continue;
				}

				movePairSingleLearners[pair] = pokemon.name;
			}
		}
	}

	const hintKeys: string[] = [];
	const hints: Dict<string[]> = {};
	for (const pair in movePairSingleLearners) {
		if (!(movePairSingleLearners[pair] in hints)) {
			hints[movePairSingleLearners[pair]] = [];
			hintKeys.push(movePairSingleLearners[pair]);
		}

		const moves = pair.split(',');
		hints[movePairSingleLearners[pair]].push(workerData.moveNames[moves[0]] + ' & ' + workerData.moveNames[moves[1]]);
		hints[movePairSingleLearners[pair]].push(workerData.moveNames[moves[1]] + ' & ' + workerData.moveNames[moves[0]]);
	}

	data.hintKeys = hintKeys;
	data.hints = hints;

	loadedData = true;
}

worker_threads.parentPort!.on('message', (incomingMessage: string) => {
	loadData();

	const parts = incomingMessage.split("|");
	const messageNumber = parts[0];
	const id = parts[1] as UniquePairsId;
	const unref = id === 'unref';
	let response: IUniquePairsResponse | null = null;
	try {
		if (id === 'initialize-thread') {
			response = {data};
		} else if (id === 'memory-usage') {
			const memUsage = process.memoryUsage();
			// @ts-expect-error
			response = [memUsage.rss, memUsage.heapUsed, memUsage.heapTotal];
		} else if (unref) {
			Tools.unrefProperties(workerData);
			Tools.unrefProperties(global.Tools);
			response = {data};
		}
	} catch (e) {
		console.log(e);
		Tools.logException(e as NodeJS.ErrnoException, "Incoming message: " + incomingMessage);
	}

	worker_threads.parentPort!.postMessage(messageNumber + "|" + id + "|" + JSON.stringify(response || ""));
	if (unref) worker_threads.parentPort!.removeAllListeners();
});
