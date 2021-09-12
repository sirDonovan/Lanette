import path = require('path');

import type { PRNGSeed } from '../lib/prng';
import { WorkerBase } from './worker-base';

export type LetterDetectorId = 'search';

export interface ILetterDetectorWorkerData {
	readonly pokemonIds: string[];
	readonly pokemonNamesById: Dict<string>;
}

export interface ILetterDetectorOptions {
	readonly basePokemon: number;
	readonly maxAdditionalPokemon: number;
	readonly prngSeed: PRNGSeed;
}

export interface ILetterDetectorResponse {
	hiddenName: string;
	names: string[];
	index: number;
	prngSeed: PRNGSeed;
}

export class LetterDetectorWorker extends WorkerBase<ILetterDetectorWorkerData, LetterDetectorId, ILetterDetectorResponse> {
	threadPath: string = path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1));

	loadData(): ILetterDetectorWorkerData {
		if (this.workerData) return this.workerData;

		const data: ILetterDetectorWorkerData = {
			pokemonIds: [],
			pokemonNamesById: {},
		};

		for (const pokemon of Games.getPokemonList()) {
			data.pokemonIds.push(pokemon.id);
			data.pokemonNamesById[pokemon.id] = pokemon.name;
		}

		return data;
	}

	async search(options: ILetterDetectorOptions): Promise<ILetterDetectorResponse | null> {
		return this.sendMessage('search', JSON.stringify(options));
	}
}
