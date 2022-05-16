import path = require('path');

import type { PRNGSeed } from '../lib/prng';
import type { WorkerBaseMessageId } from './worker-base';
import { WorkerBase } from './worker-base';

export type PortmanteausId = WorkerBaseMessageId | 'search';

export type PoolType = 'Move' | 'Pokemon';

export interface IPortmanteausWorkerData {
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

		for (const type of poolTypes) {
			for (const category of data.portCategories[type]) {
				data.pool[type][category] = {};
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
		for (const move of moves) {
			if (!(move.type in data.pool['Move']['type'])) data.pool['Move']['type'][move.type] = [];
			data.pool['Move']['type'][move.type].push(move.name);
		}

		const disallowedFormes: string[] = ["Gmax", "Rapid-Strike-Gmax", "Low-Key-Gmax", "Eternamax"];
		const pokedex = Games.getPokemonList();
		for (const pokemon of pokedex) {
			if (pokemon.forme && disallowedFormes.includes(pokemon.forme)) continue;

			if (Games.isIncludedPokemonTier(pokemon.tier)) {
				if (!(pokemon.tier in data.pool['Pokemon']['tier'])) data.pool['Pokemon']['tier'][pokemon.tier] = [];
				data.pool['Pokemon']['tier'][pokemon.tier].push(pokemon.name);
			}

			if (Dex.isPseudoLCPokemon(pokemon)) {
				if (!('LC' in data.pool['Pokemon']['tier'])) data.pool['Pokemon']['tier']['LC'] = [];
				data.pool['Pokemon']['tier']['LC'].push(pokemon.name);
			}

			if (!(pokemon.color in data.pool['Pokemon']['color'])) data.pool['Pokemon']['color'][pokemon.color] = [];
			data.pool['Pokemon']['color'][pokemon.color].push(pokemon.name);

			if (!(pokemon.gen in data.pool['Pokemon']['gen'])) data.pool['Pokemon']['gen'][pokemon.gen] = [];
			data.pool['Pokemon']['gen'][pokemon.gen].push(pokemon.name);

			for (const type of pokemon.types) {
				if (!(type in data.pool['Pokemon']['type'])) data.pool['Pokemon']['type'][type] = [];
				data.pool['Pokemon']['type'][type].push(pokemon.name);
			}

			for (const eggGroup of pokemon.eggGroups) {
				if (!(eggGroup in data.pool['Pokemon']['egggroup'])) data.pool['Pokemon']['egggroup'][eggGroup] = [];
				data.pool['Pokemon']['egggroup'][eggGroup].push(pokemon.name);
			}
		}

		return data;
	}

	async search(options: IPortmanteausSearchOptions): Promise<IPortmanteausResponse | null> {
		return this.sendMessage('search', JSON.stringify(options));
	}
}
