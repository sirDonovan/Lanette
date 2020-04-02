import path = require('path');
import { PRNGSeed } from '../prng';
import { WorkerBase } from './worker-base';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface IPortmanteausIdKeys {
	search: any;
}
export type PortmanteausId = keyof IPortmanteausIdKeys;

interface IPoolType {
	// Item: any;
	Move: any;
	Pokemon: any;
}
export type PoolType = keyof IPoolType;
/* eslint-enable */

export interface IPortmanteausWorkerData {
	pool: KeyedDict<IPoolType, Dict<Dict<string[]>>>;
	portCategories: KeyedDict<IPoolType, string[]>;
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
}

export class PortmanteausWorker extends WorkerBase<IPortmanteausWorkerData, PortmanteausId, IPortmanteausResponse> {
	threadPath: string = path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1));

	loadData(): IPortmanteausWorkerData {
		if (this.workerData) return this.workerData;

		const data: IPortmanteausWorkerData = {
			pool: {
				"Pokemon": {},
				// "Item": {},
				"Move": {},
			},
			portCategories: {
				"Pokemon": ['tier', 'color', 'type', 'gen', 'egggroup'],
				// "Item": ['type'],
				"Move": ['type'],
			},
		};

		const poolTypes = Object.keys(data.pool) as PoolType[];

		for (let i = 0; i < poolTypes.length; i++) {
			const type = poolTypes[i];
			for (let i = 0; i < data.portCategories[type].length; i++) {
				data.pool[type][data.portCategories[type][i]] = {};
			}
		}

		/*
		data.pool['Item']['type']['Berry'] = [];
		data.pool['Item']['type']['Plate'] = [];
		data.pool['Item']['type']['Drive'] = [];

		// /is shows all items
		for (const i in dex.data.items) {
			const item = dex.getExistingItem(i);
			if (item.isBerry) {
				data.pool['Item']['type']['Berry'].push(item.name.substr(0, item.name.indexOf(' Berry')));
			}
			if (item.onPlate) {
				data.pool['Item']['type']['Plate'].push(item.name.substr(0, item.name.indexOf(' Plate')));
			} else if (item.onDrive) {
				data.pool['Item']['type']['Drive'].push(item.name.substr(0, item.name.indexOf(' Drive')));
			}
		}
		*/

		const moves = Games.getMovesList();
		for (let i = 0; i < moves.length; i++) {
			const move = moves[i];
			if (!(move.type in data.pool['Move']['type'])) data.pool['Move']['type'][move.type] = [];
			data.pool['Move']['type'][move.type].push(move.name);
		}

		const pokedex = Games.getPokemonList();
		for (let i = 0; i < pokedex.length; i++) {
			const pokemon = pokedex[i];
			if (Games.isIncludedPokemonTier(pokemon.tier)) {
				if (!(pokemon.tier in data.pool['Pokemon']['tier'])) data.pool['Pokemon']['tier'][pokemon.tier] = [];
				if (!(pokemon.forme && data.pool['Pokemon']['tier'][pokemon.tier].includes(pokemon.baseSpecies))) data.pool['Pokemon']['tier'][pokemon.tier].push(pokemon.species);
			}
			if (Dex.isPseudoLCPokemon(pokemon)) {
				if (!('LC' in data.pool['Pokemon']['tier'])) data.pool['Pokemon']['tier']['LC'] = [];
				if (!(pokemon.forme && data.pool['Pokemon']['tier']['LC'].includes(pokemon.baseSpecies))) data.pool['Pokemon']['tier']['LC'].push(pokemon.species);
			}
			if (!(pokemon.color in data.pool['Pokemon']['color'])) data.pool['Pokemon']['color'][pokemon.color] = [];
			if (!(pokemon.forme && data.pool['Pokemon']['color'][pokemon.color].includes(pokemon.baseSpecies))) data.pool['Pokemon']['color'][pokemon.color].push(pokemon.species);
			if (!(pokemon.gen in data.pool['Pokemon']['gen'])) data.pool['Pokemon']['gen'][pokemon.gen] = [];
			if (!(pokemon.forme && data.pool['Pokemon']['gen'][pokemon.gen].includes(pokemon.baseSpecies))) data.pool['Pokemon']['gen'][pokemon.gen].push(pokemon.species);
			for (let i = 0; i < pokemon.types.length; i++) {
				if (!(pokemon.types[i] in data.pool['Pokemon']['type'])) data.pool['Pokemon']['type'][pokemon.types[i]] = [];
				if (!(pokemon.forme && data.pool['Pokemon']['type'][pokemon.types[i]].includes(pokemon.baseSpecies))) data.pool['Pokemon']['type'][pokemon.types[i]].push(pokemon.species);
			}
			for (let i = 0; i < pokemon.eggGroups.length; i++) {
				if (!(pokemon.eggGroups[i] in data.pool['Pokemon']['egggroup'])) data.pool['Pokemon']['egggroup'][pokemon.eggGroups[i]] = [];
				if (!(pokemon.forme && data.pool['Pokemon']['egggroup'][pokemon.eggGroups[i]].includes(pokemon.baseSpecies))) data.pool['Pokemon']['egggroup'][pokemon.eggGroups[i]].push(pokemon.species);
			}
		}

		return data;
	}

	search(options: IPortmanteausSearchOptions): Promise<IPortmanteausResponse> {
		return this.sendMessage('search', JSON.stringify(options));
	}
}
