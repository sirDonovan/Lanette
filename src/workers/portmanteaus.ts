import path = require('path');
import worker_threads = require('worker_threads');

export interface IPortmanteausWorkerData {
	pool: Dict<Dict<Dict<string[]>>>;
	portCategories: Dict<string[]>;
}

export interface IPortmanteauSearchOptions {
	maxLetters: number;
	minLetters: number;
	numberOfPorts: number;
	customPortCategories?: string[] | null;
	customPortDetails?: string[] | null;
	customPortTypes?: string[] | null;
}

export interface IPortmanteauSearchResult {
	answers: string[];
	answerParts: Dict<string[]>;
	ports: string[];
}

const data: IPortmanteausWorkerData = {
	pool: {
		"Pokemon": {},
		"Item": {},
		"Move": {},
	},
	portCategories: {
		"Pokemon": ['tier', 'color', 'type', 'gen', 'egggroup'],
		"Item": ['type'],
		"Move": ['type'],
	},
};

let worker: worker_threads.Worker | undefined;

export function init(): worker_threads.Worker {
	if (worker) return worker;

	for (const category in data.portCategories) {
		for (let i = 0; i < data.portCategories[category].length; i++) {
			data.pool[category][data.portCategories[category][i]] = {};
		}
	}

	data.pool['Item']['type']['Berry'] = [];
	data.pool['Item']['type']['Plate'] = [];
	data.pool['Item']['type']['Drive'] = [];

	// /is shows all items
	for (const i in Dex.data.items) {
		const item = Dex.getExistingItem(i);
		if (item.isBerry) {
			data.pool['Item']['type']['Berry'].push(item.name.substr(0, item.name.indexOf(' Berry')));
		} else if (item.onPlate) {
			data.pool['Item']['type']['Plate'].push(item.name.substr(0, item.name.indexOf(' Plate')));
		} else if (item.onDrive) {
			data.pool['Item']['type']['Drive'].push(item.name.substr(0, item.name.indexOf(' Drive')));
		}
	}

	const moves = Dex.getMovesList();
	for (let i = 0; i < moves.length; i++) {
		const move = moves[i];
		if (!(move.type in data.pool['Move']['type'])) data.pool['Move']['type'][move.type] = [];
		data.pool['Move']['type'][move.type].push(move.name);
	}

	const pokedex = Dex.getPokemonList();
	for (let i = 0; i < pokedex.length; i++) {
		const pokemon = pokedex[i];
		if (pokemon.tier !== 'Illegal') {
			if (!(pokemon.tier in data.pool['Pokemon']['tier'])) data.pool['Pokemon']['tier'][pokemon.tier] = [];
			if (!(pokemon.forme && data.pool['Pokemon']['tier'][pokemon.tier].includes(pokemon.baseSpecies))) data.pool['Pokemon']['tier'][pokemon.tier].push(pokemon.species);
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
	worker.setMaxListeners(Infinity);
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

export async function search(options: IPortmanteauSearchOptions): Promise<IPortmanteauSearchResult> {
	return (new Promise((resolve, reject) => {
		worker!.once('message', resolve);
		worker!.once('error', resolve);
		worker!.postMessage('search|' + JSON.stringify(options));
	}));
}
