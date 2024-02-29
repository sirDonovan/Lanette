import path = require('path');

import type { PRNGSeed } from '../lib/prng';
import type { WorkerBaseMessageId } from './worker-base';
import { WorkerBase } from './worker-base';
import { IMove, IPokemon } from '../types/pokemon-showdown';

export type PortmanteausId = WorkerBaseMessageId | 'search';

export type PoolType = 'Move' | 'Pokemon';

export interface IPortmanteausWorkerData {
	readonly excludedTiers: readonly string[];
	readonly movesList: readonly IMove[];
	readonly pokemonList: readonly IPokemon[];
	readonly pseudoLCPokemon: readonly string[];
}

export interface IPortmanteausThreadData {
	pool: KeyedDict<PoolType, Dict<Dict<string[]>>>;
	portCategories: KeyedDict<PoolType, string[]>;
}

export interface IPortmanteausSearchOptions {
	maxLetters: number;
	minLetters: number;
	numberOfPorts: number;
	prngSeed: PRNGSeed;
	customPortCategories?: string[] | null;
	customPortDetails?: string[] | null;
	customPortTypes?: PoolType[] | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IPortmanteausSearchMessage extends IPortmanteausSearchOptions {}

export interface IPortmanteausResponse {
	answers: string[];
	answerParts: Dict<string[]>;
	ports: string[];
	prngSeed: PRNGSeed;
	data?: IPortmanteausThreadData;
}

export class PortmanteausWorker extends WorkerBase<IPortmanteausWorkerData, PortmanteausId, IPortmanteausResponse> {
	threadPath: string = path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1));
	threadData: IPortmanteausThreadData | undefined;

	loadData(): IPortmanteausWorkerData {
		if (this.workerData) return this.workerData;

		const moves = Games.getMovesList();
		const movesList: IMove[] = [];
		for (const move of moves) {
			movesList.push(JSON.parse(JSON.stringify(move)) as IMove);
		}

		const pokemon = Games.getPokemonList();
		const pokemonList: IPokemon[] = [];
		const pseudoLCPokemon: string[] = [];
		for (const species of pokemon) {
			pokemonList.push(JSON.parse(JSON.stringify(species)) as IPokemon);
			if (Dex.isPseudoLCPokemon(species)) pseudoLCPokemon.push(species.id);
		}

		const data: IPortmanteausWorkerData = {
			excludedTiers: Games.getExcludedTiers(),
			movesList,
			pokemonList,
			pseudoLCPokemon,
		};

		return data;
	}

	async initializeThread(): Promise<void> {
		if (this.threadData) return;

		const response = await this.sendMessage('initialize-thread');
		if (response && response.data) this.threadData = response.data;
	}

	getThreadData(): IPortmanteausThreadData {
		return this.threadData!;
	}

	async search(options: IPortmanteausSearchOptions): Promise<IPortmanteausResponse | null> {
		return this.sendMessage('search', JSON.stringify(options));
	}

	async unref(): Promise<void> {
		await super.unref();
		Tools.unrefProperties(this.threadData);
	}
}
