import path = require('path');
import worker_threads = require('worker_threads');
import { PRNGSeed } from '../prng';

interface IPoolType {
	// Item: any;
	Move: any;
	Pokemon: any;
}
export type PoolType = keyof IPoolType;

export interface IPortmanteausWorkerData {
	pool: KeyedDict<IPoolType, Dict<Dict<string[]>>>;
	portCategories: KeyedDict<IPoolType, string[]>;
}

export interface IPortmanteauSearchOptions {
	maxLetters: number;
	minLetters: number;
	numberOfPorts: number;
	prngSeed: PRNGSeed;
	customPortCategories?: string[] | null;
	customPortDetails?: string[] | null;
	customPortTypes?: PoolType[] | null;
}

export interface IPortmanteauSearchRequest extends IPortmanteauSearchOptions {
	requestNumber: number;
}

export interface IPortmanteauSearchResult {
	answers: string[];
	answerParts: Dict<string[]>;
	ports: string[];
	prngSeed: PRNGSeed;
}

export interface IPortmanteauSearchResponse extends IPortmanteauSearchResult {
	requestNumber: number;
}

interface IPortmanteauSearchQueueItem {
	resolve: (value?: IPortmanteauSearchResult | PromiseLike<IPortmanteauSearchResult> | undefined) => void;
	requestNumber: number;
}

export const data: IPortmanteausWorkerData = {
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

let requestNumber = 0;
const requestQueue: IPortmanteauSearchQueueItem[] = [];
let worker: worker_threads.Worker | undefined;

export function init(): worker_threads.Worker {
	if (worker) return worker;

	for (let i = 0; i < poolTypes.length; i++) {
		const type = poolTypes[i];
		for (let i = 0; i < data.portCategories[type].length; i++) {
			data.pool[type][data.portCategories[type][i]] = {};
		}
	}

	const dex = Dex.getDex('gen7');

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

	const moves = dex.getMovesList();
	for (let i = 0; i < moves.length; i++) {
		const move = moves[i];
		if (!(move.type in data.pool['Move']['type'])) data.pool['Move']['type'][move.type] = [];
		data.pool['Move']['type'][move.type].push(move.name);
	}

	const pokedex = dex.getPokemonList();
	for (let i = 0; i < pokedex.length; i++) {
		const pokemon = pokedex[i];
		if (pokemon.tier.charAt(0) !== '(') {
			if (!(pokemon.tier in data.pool['Pokemon']['tier'])) data.pool['Pokemon']['tier'][pokemon.tier] = [];
			if (!(pokemon.forme && data.pool['Pokemon']['tier'][pokemon.tier].includes(pokemon.baseSpecies))) data.pool['Pokemon']['tier'][pokemon.tier].push(pokemon.species);
		}
		if (pokemon.pseudoLC) {
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

	worker = new worker_threads.Worker(path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1)), {workerData: data});
	worker.on('message', (message: string) => {
		const pipeIndex = message.indexOf('|');
		const result: IPortmanteauSearchResponse = JSON.parse(message.substr(pipeIndex + 1));
		for (let i = 0; i < requestQueue.length; i++) {
			if (requestQueue[i].requestNumber === result.requestNumber) {
				requestQueue.splice(i, 1)[0].resolve(result);
				break;
			}
		}
	});
	worker.on('error', e => console.log(e));
	worker.on('exit', code => {
		if (code !== 0) {
			console.log(new Error(`Worker stopped with exit code ${code}`));
		}
	});

	return worker;
}

export function unref() {
	if (worker) worker.unref();
}

export function search(options: IPortmanteauSearchOptions): Promise<IPortmanteauSearchResult> {
	return (new Promise(resolve => {
		const request: IPortmanteauSearchRequest = Object.assign({}, options, {requestNumber});
		requestQueue.push({resolve, requestNumber});
		requestNumber++;
		worker!.postMessage('search|' + JSON.stringify(request));
	}));
}
