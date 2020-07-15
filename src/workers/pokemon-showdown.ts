import path = require('path');

import { WorkerBase } from './worker-base';
import type { IAbility, IFormat, IItem, ILearnsetData, IMove, IPokemon, ITypeData } from '../types/dex';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface IPokemonShowdownIdKeys {
	getAbilities: any;
	getAbilityIds: any;
	getAliases: any;
	getAllPossibleMoves: any;
	getFormats: any;
	getFormatIds: any;
	getItems: any;
	getItemIds: any;
	getLearnsetData: any;
	getLearnsetDataIds: any;
	getMoves: any;
	getMoveIds: any;
	getSpecies: any;
	getSpeciesIds: any;
	getTypes: any;
	getTypeIds: any;
}
/* eslint-enable */
export type PokemonShowdownId = keyof IPokemonShowdownIdKeys;

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface IPokemonShowdownWorkerData {}

interface IGetDataInput {
	mod: string;
	keys: string[];
	startIndex: number;
}

export interface IGetDataOptions extends IGetDataInput {
	availableHeapSize: number;
}

export interface IGetDataIdsOptions {
	mod: string;
}

export interface IGetDataMessage extends IGetDataOptions {}

export interface IGetDataIdsMessage extends IGetDataIdsOptions {}

/* eslint-enable */

export interface IPokemonShowdownResponse {
	data: string;
}

type WorkerNames = 'gen1' | 'gen2' | 'gen3' | 'gen4' | 'gen5' | 'gen6' | 'gen7' | 'gen8';

export class PokemonShowdownWorker extends
	WorkerBase<IPokemonShowdownWorkerData, PokemonShowdownId, IPokemonShowdownResponse, WorkerNames> {
	threadPath: string = path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1));
	workerNames: WorkerNames[] = ['gen1', 'gen2', 'gen3', 'gen4', 'gen5', 'gen6', 'gen7', 'gen8'];

	loadData(): IPokemonShowdownWorkerData {
		if (this.workerData) return this.workerData;

		return {};
	}

	getWorkerNumber(name: WorkerNames): number {
		return this.workerNames.indexOf(name);
	}

	async getAbilities(mod: string): Promise<{aliases: Dict<string>, abilities: IAbility[]} | null> {
		const idsRequest = await this.getAbilityIds(mod);
		if (idsRequest === null) throw new Error("An error occurred while getting ability IDs");

		const ids = JSON.parse(idsRequest.data) as {aliases: Dict<string>, keys: string[]};
		const keys = ids.keys;

		let abilities: IAbility[] = [];
		let currentIndex = 0;
		const endIndex = keys.length - 1;
		while (currentIndex < endIndex) {
			const response = await this.sendMessage('getAbilities',
				JSON.stringify(Object.assign({mod, keys, startIndex: currentIndex}, {availableHeapSize: Tools.getHeapLimit()})),
				this.getWorkerNumber(mod as WorkerNames));
			if (response === null) return Promise.resolve(null);

			const batch = JSON.parse(response.data) as {abilities: IAbility[]; endIndex: number};
			if (batch.endIndex === currentIndex) {
				console.log("Not enough memory to load abilities");
				return Promise.resolve(null);
			}

			abilities = abilities.concat(batch.abilities);
			currentIndex = batch.endIndex;
		}

		return Promise.resolve({aliases: ids.aliases, abilities});
	}

	async getAbilityIds(mod: string): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getAbilityIds', JSON.stringify({mod}), this.getWorkerNumber(mod as WorkerNames));
	}

	async getAliases(mod: string): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getAliases', JSON.stringify({mod}), this.getWorkerNumber(mod as WorkerNames));
	}

	async getAllPossibleMoves(mod: string): Promise<Dict<string[]> | null> {
		const idsRequest = await this.getSpeciesIds(mod);
		if (idsRequest === null) throw new Error("An error occurred while getting pokemon IDs");

		const ids = JSON.parse(idsRequest.data) as {keys: string[]};
		const keys = ids.keys;

		const allPossibleMoves: Dict<string[]> = {};
		let currentIndex = 0;
		const endIndex = keys.length - 1;
		while (currentIndex < endIndex) {
			const response = await this.sendMessage('getAllPossibleMoves',
				JSON.stringify(Object.assign({mod, keys, startIndex: currentIndex}, {availableHeapSize: Tools.getHeapLimit()})),
				this.getWorkerNumber(mod as WorkerNames));
			if (response === null) return Promise.resolve(null);

			const batch = JSON.parse(response.data) as {allPossibleMoves: Dict<string[]>; endIndex: number};
			if (batch.endIndex === currentIndex) {
				console.log("Not enough memory to load all possible moves");
				return Promise.resolve(null);
			}

			Object.assign(allPossibleMoves, batch.allPossibleMoves);
			currentIndex = batch.endIndex;
		}

		return Promise.resolve(allPossibleMoves);
	}

	async getFormats(mod: string): Promise<{aliases: Dict<string>, formats: IFormat[]} | null> {
		const idsRequest = await this.getFormatIds(mod);
		if (idsRequest === null) throw new Error("An error occurred while getting format IDs");

		const ids = JSON.parse(idsRequest.data) as {aliases: Dict<string>, keys: string[]};
		const keys = ids.keys;

		let formats: IFormat[] = [];
		let currentIndex = 0;
		const endIndex = keys.length - 1;
		while (currentIndex < endIndex) {
			const response = await this.sendMessage('getFormats',
				JSON.stringify(Object.assign({mod, keys, startIndex: currentIndex}, {availableHeapSize: Tools.getHeapLimit()})),
				this.getWorkerNumber(mod as WorkerNames));
			if (response === null) return Promise.resolve(null);

			const batch = JSON.parse(response.data) as {formats: IFormat[]; endIndex: number};
			if (batch.endIndex === currentIndex) {
				console.log("Not enough memory to load all possible moves");
				return Promise.resolve(null);
			}

			formats = formats.concat(batch.formats);
			currentIndex = batch.endIndex;
		}

		return Promise.resolve({aliases: ids.aliases, formats});
	}

	async getFormatIds(mod: string): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getFormatIds', JSON.stringify({mod}), this.getWorkerNumber(mod as WorkerNames));
	}

	async getItems(mod: string): Promise<{aliases: Dict<string>, items: IItem[]} | null> {
		const idsRequest = await this.getItemIds(mod);
		if (idsRequest === null) throw new Error("An error occurred while getting item IDs");

		const ids = JSON.parse(idsRequest.data) as {aliases: Dict<string>, keys: string[]};
		const keys = ids.keys;

		let items: IItem[] = [];
		let currentIndex = 0;
		const endIndex = keys.length - 1;
		while (currentIndex < endIndex) {
			const response = await this.sendMessage('getItems',
				JSON.stringify(Object.assign({mod, keys, startIndex: currentIndex}, {availableHeapSize: Tools.getHeapLimit()})),
				this.getWorkerNumber(mod as WorkerNames));
			if (response === null) return Promise.resolve(null);

			const batch = JSON.parse(response.data) as {items: IItem[]; endIndex: number};
			if (batch.endIndex === currentIndex) {
				console.log("Not enough memory to load all possible moves");
				return Promise.resolve(null);
			}

			items = items.concat(batch.items);
			currentIndex = batch.endIndex;
		}

		return Promise.resolve({aliases: ids.aliases, items});
	}

	async getItemIds(mod: string): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getItemIds', JSON.stringify({mod}), this.getWorkerNumber(mod as WorkerNames));
	}

	async getLearnsetData(mod: string): Promise<Dict<ILearnsetData> | null> {
		const idsRequest = await this.getLearnsetDataIds(mod);
		if (idsRequest === null) throw new Error("An error occurred while getting learnset data IDs");

		const ids = JSON.parse(idsRequest.data) as {keys: string[]};
		const keys = ids.keys;

		const learnsetData: Dict<ILearnsetData> = {};
		let currentIndex = 0;
		const endIndex = keys.length - 1;
		while (currentIndex < endIndex) {
			const response = await this.sendMessage('getLearnsetData',
				JSON.stringify(Object.assign({mod, keys, startIndex: currentIndex}, {availableHeapSize: Tools.getHeapLimit()})),
				this.getWorkerNumber(mod as WorkerNames));
			if (response === null) return Promise.resolve(null);

			const batch = JSON.parse(response.data) as {learnsets: Dict<ILearnsetData>; endIndex: number};
			if (batch.endIndex === currentIndex) {
				console.log("Not enough memory to load all possible moves");
				return Promise.resolve(null);
			}

			Object.assign(learnsetData, batch.learnsets);
			currentIndex = batch.endIndex;
		}

		return Promise.resolve(learnsetData);
	}

	async getLearnsetDataIds(mod: string): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getLearnsetDataIds', JSON.stringify({mod}), this.getWorkerNumber(mod as WorkerNames));
	}

	async getMoves(mod: string): Promise<{aliases: Dict<string>, moves: IMove[]} | null> {
		const idsRequest = await this.getMoveIds(mod);
		if (idsRequest === null) throw new Error("An error occurred while getting move IDs");

		const ids = JSON.parse(idsRequest.data) as {aliases: Dict<string>, keys: string[]};
		const keys = ids.keys;

		let moves: IMove[] = [];
		let currentIndex = 0;
		const endIndex = keys.length - 1;
		while (currentIndex < endIndex) {
			const response = await this.sendMessage('getMoves',
				JSON.stringify(Object.assign({mod, keys, startIndex: currentIndex}, {availableHeapSize: Tools.getHeapLimit()})),
				this.getWorkerNumber(mod as WorkerNames));
			if (response === null) return Promise.resolve(null);

			const batch = JSON.parse(response.data) as {moves: IMove[]; endIndex: number};
			if (batch.endIndex === currentIndex) {
				console.log("Not enough memory to load all possible moves");
				return Promise.resolve(null);
			}

			moves = moves.concat(batch.moves);
			currentIndex = batch.endIndex;
		}

		return Promise.resolve({aliases: ids.aliases, moves});
	}

	async getMoveIds(mod: string): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getMoveIds', JSON.stringify({mod}), this.getWorkerNumber(mod as WorkerNames));
	}

	async getSpecies(mod: string): Promise<{aliases: Dict<string>, pokemon: IPokemon[]} | null> {
		const idsRequest = await this.getSpeciesIds(mod);
		if (idsRequest === null) throw new Error("An error occurred while getting ability IDs");

		const ids = JSON.parse(idsRequest.data) as {aliases: Dict<string>, keys: string[]};
		const keys = ids.keys;

		let species: IPokemon[] = [];
		let currentIndex = 0;
		const endIndex = keys.length - 1;
		while (currentIndex < endIndex) {
			const response = await this.sendMessage('getSpecies',
				JSON.stringify(Object.assign({mod, keys, startIndex: currentIndex}, {availableHeapSize: Tools.getHeapLimit()})),
				this.getWorkerNumber(mod as WorkerNames));
			if (response === null) return Promise.resolve(null);

			const batch = JSON.parse(response.data) as {pokemon: IPokemon[]; endIndex: number};
			if (batch.endIndex === currentIndex) {
				console.log("Not enough memory to load all possible moves");
				return Promise.resolve(null);
			}

			species = species.concat(batch.pokemon);
			currentIndex = batch.endIndex;
		}

		return Promise.resolve({aliases: ids.aliases, pokemon: species});
	}

	async getSpeciesIds(mod: string): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getSpeciesIds', JSON.stringify({mod}), this.getWorkerNumber(mod as WorkerNames));
	}

	async getTypes(mod: string): Promise<ITypeData[] | null> {
		const idsRequest = await this.getTypeIds(mod);
		if (idsRequest === null) throw new Error("An error occurred while getting type IDs");

		const ids = JSON.parse(idsRequest.data) as {keys: string[]};
		const keys = ids.keys;

		let types: ITypeData[] = [];
		let currentIndex = 0;
		const endIndex = keys.length - 1;
		while (currentIndex < endIndex) {
			const response = await this.sendMessage('getTypes',
				JSON.stringify(Object.assign({mod, keys, startIndex: currentIndex}, {availableHeapSize: Tools.getHeapLimit()})),
				this.getWorkerNumber(mod as WorkerNames));
			if (response === null) return Promise.resolve(null);

			const batch = JSON.parse(response.data) as {types: ITypeData[]; endIndex: number};
			if (batch.endIndex === currentIndex) {
				console.log("Not enough memory to load all possible moves");
				return Promise.resolve(null);
			}

			types = types.concat(batch.types);
			currentIndex = batch.endIndex;
		}

		return Promise.resolve(types);
	}

	async getTypeIds(mod: string): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getTypeIds', JSON.stringify({mod}), this.getWorkerNumber(mod as WorkerNames));
	}
}
