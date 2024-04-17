import path = require('path');

import type { WorkerBaseMessageId } from './worker-base';
import { WorkerBase } from './worker-base';
import { IPokemon } from '../types/pokemon-showdown';

export type UniquePairsId = WorkerBaseMessageId;

export interface IUniquePairsWorkerData {
	readonly allPossibleMoves: Dict<readonly string[]>;
	readonly bannedMoves: Dict<boolean>;
	readonly moveNames: Dict<string>;
	readonly pokemonList: readonly IPokemon[];
}

export interface IUniquePairsThreadData {
	hintKeys: readonly string[];
	hints: Dict<readonly string[]>;
}

export interface IUniquePairsResponse {
	data?: IUniquePairsThreadData;
}

export class UniquePairsWorker extends WorkerBase<IUniquePairsWorkerData, UniquePairsId, IUniquePairsResponse> {
	threadPath: string = path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1));
	threadData: IUniquePairsThreadData | undefined;

	loadData(): IUniquePairsWorkerData {
		if (this.workerData) return this.workerData;

		const bannedMoves: Dict<boolean> = {};
		const moves = Games.getMovesList();
		const moveNames: Dict<string> = {};
		for (const move of moves) {
			moveNames[move.id] = move.name;
			if (Dex.isSignatureMove(move)) bannedMoves[move.id] = true;
		}

		const allPossibleMoves: Dict<readonly string[]> = {};
		const pokemonList: IPokemon[] = [];
		Games.getPokemonList({filter: x => {
			if (x.id === 'smeargle') return false;

			const pokemonPossibleMoves = Dex.getAllPossibleMoves(x);
			if (pokemonPossibleMoves.length < 2) return false;

			allPossibleMoves[x.id] = pokemonPossibleMoves;
			pokemonList.push(JSON.parse(JSON.stringify(x)) as IPokemon);

			return true;
		}});

		const data: IUniquePairsWorkerData = {
			allPossibleMoves,
			bannedMoves,
			moveNames,
			pokemonList,
		};

		return data;
	}

	async initializeThread(): Promise<void> {
		if (this.threadData) return;

		const response = await this.sendMessage('initialize-thread');
		if (response && response.data) this.threadData = response.data;
	}

	getThreadData(): IUniquePairsThreadData {
		return this.threadData!;
	}

	async unref(): Promise<void> {
		await super.unref();
		Tools.unrefProperties(this.threadData);
	}

}
