import path = require('path');

import { WorkerBase } from './worker-base';

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

export class PokemonShowdownWorker extends WorkerBase<IPokemonShowdownWorkerData, PokemonShowdownId, IPokemonShowdownResponse> {
	requestsByUserid: string[] = [];
	threadPath: string = path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1));

	loadData(): IPokemonShowdownWorkerData {
		if (this.workerData) return this.workerData;

		return {};
	}

	async getAbilities(options: IGetDataInput): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getAbilities', JSON.stringify(Object.assign(options, {availableHeapSize: Tools.getHeapLimit()})));
	}

	async getAbilityIds(options: IGetDataIdsOptions): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getAbilityIds', JSON.stringify(options));
	}

	async getAliases(options: IGetDataIdsOptions): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getAliases', JSON.stringify(options));
	}

	async getAllPossibleMoves(options: IGetDataInput): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getAllPossibleMoves', JSON.stringify(Object.assign(options, {availableHeapSize: Tools.getHeapLimit()})));
	}

	async getFormats(options: IGetDataInput): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getFormats', JSON.stringify(Object.assign(options, {availableHeapSize: Tools.getHeapLimit()})));
	}

	async getFormatIds(options: IGetDataIdsOptions): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getFormatIds', JSON.stringify(options));
	}

	async getItems(options: IGetDataInput): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getItems', JSON.stringify(Object.assign(options, {availableHeapSize: Tools.getHeapLimit()})));
	}

	async getItemIds(options: IGetDataIdsOptions): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getItemIds', JSON.stringify(options));
	}

	async getLearnsetData(options: IGetDataInput): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getLearnsetData', JSON.stringify(Object.assign(options, {availableHeapSize: Tools.getHeapLimit()})));
	}

	async getLearnsetDataIds(options: IGetDataIdsOptions): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getLearnsetDataIds', JSON.stringify(options));
	}

	async getMoves(options: IGetDataInput): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getMoves', JSON.stringify(Object.assign(options, {availableHeapSize: Tools.getHeapLimit()})));
	}

	async getMoveIds(options: IGetDataIdsOptions): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getMoveIds', JSON.stringify(options));
	}

	async getSpecies(options: IGetDataInput): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getSpecies', JSON.stringify(Object.assign(options, {availableHeapSize: Tools.getHeapLimit()})));
	}

	async getSpeciesIds(options: IGetDataIdsOptions): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getSpeciesIds', JSON.stringify(options));
	}

	async getTypes(options: IGetDataInput): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getTypes', JSON.stringify(Object.assign(options, {availableHeapSize: Tools.getHeapLimit()})));
	}

	async getTypeIds(options: IGetDataIdsOptions): Promise<IPokemonShowdownResponse | null> {
		return this.sendMessage('getTypeIds', JSON.stringify(options));
	}
}
