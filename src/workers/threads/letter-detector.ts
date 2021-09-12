import worker_threads = require('worker_threads');

import type { PRNGSeed } from '../../lib/prng';
import { PRNG } from '../../lib/prng';
import * as tools from '../../tools';
import type {
	ILetterDetectorWorkerData, ILetterDetectorOptions, ILetterDetectorResponse, LetterDetectorId
} from '../letter-detector';

// eslint-disable-next-line @typescript-eslint/naming-convention
const Tools = new tools.Tools();
const data = worker_threads.workerData as DeepImmutable<ILetterDetectorWorkerData>;
const MAX_OUTER_ATTEMPTS = 1000;
const MAX_INNER_ATTEMPTS = 64;

function search(options: ILetterDetectorOptions, prng: PRNG): ILetterDetectorResponse {
	let index = -1;
	let hiddenName = "";
	let attempts = 0;
	let ids: string[] = [];

	let additionalPokemon = options.maxAdditionalPokemon;
	let totalPokemon = options.basePokemon + additionalPokemon;
	while (!hiddenName && attempts < MAX_OUTER_ATTEMPTS) {
		ids = Tools.sampleMany(data.pokemonIds, totalPokemon, prng);

		let idsAttempts = 0;
		while (!hiddenName && idsAttempts < MAX_INNER_ATTEMPTS) {
			outerloop:
			for (let i = 0; i < ids[0].length; i++) {
				let combined = "";
				for (const id of ids) {
					if (!id[i]) continue outerloop;
					combined += id[i];
				}

				if (combined in data.pokemonNamesById) {
					index = i;
					hiddenName = data.pokemonNamesById[combined];
					break;
				}
			}

			if (hiddenName) break;

			ids = Tools.shuffle(ids, prng);
			idsAttempts++;
		}

		attempts++;
		if (attempts === MAX_OUTER_ATTEMPTS) {
			attempts = 0;
			additionalPokemon--;
			totalPokemon = options.basePokemon + additionalPokemon;
			if (additionalPokemon < 0) break;
		}
	}

	return {
		hiddenName,
		names: ids.map(x => data.pokemonNamesById[x]),
		index,
		prngSeed: prng.seed.slice() as PRNGSeed,
	};
}

worker_threads.parentPort!.on('message', (incommingMessage: string) => {
	const parts = incommingMessage.split("|");
	const messageNumber = parts[0];
	const id = parts[1] as LetterDetectorId;
	const message = parts.slice(2).join("|");
	let response: ILetterDetectorResponse | null = null;
	try {
		const options = JSON.parse(message) as ILetterDetectorOptions;
		const prng = new PRNG(options.prngSeed);
		response = search(options, prng);
	} catch (e) {
		console.log(e);
		Tools.logError(e as NodeJS.ErrnoException);
	}

	worker_threads.parentPort!.postMessage(messageNumber + "|" + id + "|" + JSON.stringify(response || ""));
});
