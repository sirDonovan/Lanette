import path = require('path');

import type { PRNGSeed } from '../lib/prng';
import type { WorkerBaseMessageId } from './worker-base';
import { WorkerBase } from './worker-base';
import { IMove, IPokemon, ITypeData } from '../types/pokemon-showdown';

export type ParametersId = WorkerBaseMessageId | 'search' | 'intersect';

export type ParamType = 'ability' | 'color' | 'egggroup' | 'gen' | 'letter' | 'move' | 'resistance' | 'tier' | 'type' | 'weakness';

export interface IParam {
	type: ParamType;
	param: string;
}

export interface IParametersGenData {
	readonly evolutionLines: string[];
	readonly formes: Dict<string>;
	readonly gigantamax: string[];
	readonly paramTypePools: KeyedDict<ParamType, Dict<IParam>>;
	readonly paramTypeDexes: KeyedDict<ParamType, Dict<string[]>>;
	readonly otherFormes: Dict<string>;
}

export interface IParametersWorkerData {
	readonly allPossibleMoves: Dict<Dict<readonly string[]>>;
	readonly currentGen: number;
	readonly evolutionLines: Dict<Dict<readonly string[][]>>;
	readonly excludedTiers: readonly string[];
	readonly moveLists: Dict<readonly IMove[]>;
	readonly pokemonLists: Dict<readonly IPokemon[]>;
	readonly pseudoLCPokemon: Dict<readonly string[]>;
	readonly types: Dict<Dict<ITypeData | undefined>>;
}

export interface IParametersThreadData {
	readonly pokemon: {gens: Dict<IParametersGenData>};
}

export type ParametersSearchType = keyof IParametersThreadData;

export interface IParametersResponse {
	params: IParam[];
	pokemon: string[];
	prngSeed?: PRNGSeed;
	data?: IParametersThreadData;
}

export interface IParametersSearchOptions {
	readonly mod: string;
	readonly numberOfParams: number;
	readonly minimumResults: number;
	readonly maximumResults: number;
	readonly paramTypes: ParamType[];
	readonly prngSeed: PRNGSeed;
	readonly searchType: ParametersSearchType;
	readonly customParamTypes?: ParamType[] | null;
	readonly filter?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IParametersSearchMessage extends IParametersSearchOptions {}

export interface IParametersIntersectOptions {
	readonly mod: string;
	readonly params: IParam[];
	readonly paramTypes: ParamType[];
	readonly searchType: ParametersSearchType;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IParametersIntersectMessage extends IParametersIntersectOptions {}

export class ParametersWorker extends WorkerBase<IParametersWorkerData, ParametersId, IParametersResponse> {
	threadPath: string = path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1));
	threadData: IParametersThreadData | undefined;

	loadData(): IParametersWorkerData {
		if (this.workerData) return this.workerData;

		const data: IParametersWorkerData = {
			allPossibleMoves: {},
			currentGen: Dex.getGen(),
			evolutionLines: {},
			excludedTiers: Games.getExcludedTiers(),
			moveLists: {},
			pokemonLists: {},
			pseudoLCPokemon: {},
			types: {},
		};

		const currentGen = Dex.getGen();
		for (let gen = 1; gen <= currentGen; gen++) {
			const moves = Games.getMovesList(undefined, gen);
			const movesList: IMove[] = [];
			for (const move of moves) {
				movesList.push(JSON.parse(JSON.stringify(move)) as IMove);
			}
			data.moveLists[gen] = movesList;

			const pokemon = Games.getPokemonList({gen});
			const allPossibleMoves: Dict<readonly string[]> = {};
			const evolutionLines: Dict<readonly string[][]> = {};
			const pokemonList: IPokemon[] = [];
			const pseudoLCPokemon: string[] = [];
			for (const species of pokemon) {
				allPossibleMoves[species.id] = Dex.getAllPossibleMoves(species);
				evolutionLines[species.id] = Dex.getEvolutionLines(species);
				pokemonList.push(JSON.parse(JSON.stringify(species)) as IPokemon);
				if (Dex.isPseudoLCPokemon(species)) pseudoLCPokemon.push(species.id);
			}
			data.allPossibleMoves[gen] = allPossibleMoves;
			data.evolutionLines[gen] = evolutionLines;
			data.pokemonLists[gen] = pokemonList;
			data.pseudoLCPokemon[gen] = pseudoLCPokemon;

			const typesList = Dex.getTypesList();
			const types: Dict<ITypeData> = {};
			for (const type of typesList) {
				types[type.id] = JSON.parse(JSON.stringify(type)) as ITypeData;
			}
			data.types[gen] = types;
		}

		return data;
	}

	async initializeThread(): Promise<void> {
		if (this.threadData) return;

		const response = await this.sendMessage('initialize-thread');
		if (response && response.data) this.threadData = response.data;
	}

	getThreadData(): IParametersThreadData {
		return this.threadData!;
	}

	async search(options: IParametersSearchOptions): Promise<IParametersResponse | null> {
		return this.sendMessage('search', JSON.stringify(options));
	}

	intersect(options: IParametersIntersectOptions): IParametersResponse | null {
		const intersection = Tools.intersectParams(options.searchType, options.params,
			this.threadData![options.searchType].gens[options.mod]);
		return {
			params: options.params,
			pokemon: intersection,
		};
	}
}
