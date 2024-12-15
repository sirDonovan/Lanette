import worker_threads = require('worker_threads');

import type { PRNGSeed } from '../../lib/prng';
import { PRNG } from '../../lib/prng';
import * as tools from '../../tools';
import type {
	IPortmanteausResponse, IPortmanteausSearchMessage, IPortmanteausThreadData, IPortmanteausWorkerData, PoolType, PortmanteausId
} from '../portmanteaus';

const Tools = new tools.Tools();
const workerData = worker_threads.workerData as IPortmanteausWorkerData;
const data: IPortmanteausThreadData = {
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
let portTypes: PoolType[];

let loadedData = false;
function loadData(): void {
	if (loadedData) return;

	portTypes = Object.keys(data.pool) as PoolType[];

	for (const type of portTypes) {
		for (const category of data.portCategories[type]) {
			data.pool[type][category] = {};
		}
	}

	/*
	data.pool['Item']['type']['Berry'] = [];
	data.pool['Item']['type']['Plate'] = [];
	data.pool['Item']['type']['Drive'] = [];

	// /is shows all items
	for (const item of workerData.itemsList) {
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

	for (const move of workerData.movesList) {
		if (!(move.type in data.pool.Move.type)) data.pool.Move.type[move.type] = [];
		data.pool.Move.type[move.type].push(move.name);
	}

	const disallowedFormes: string[] = ["Gmax", "Rapid-Strike-Gmax", "Low-Key-Gmax", "Eternamax"];
	for (const pokemon of workerData.pokemonList) {
		if (pokemon.forme && disallowedFormes.includes(pokemon.forme)) continue;

		if (!workerData.excludedTiers.includes(pokemon.tier)) {
			if (!(pokemon.tier in data.pool.Pokemon.tier)) data.pool.Pokemon.tier[pokemon.tier] = [];
			data.pool.Pokemon.tier[pokemon.tier].push(pokemon.name);
		}

		if (workerData.pseudoLCPokemon.includes(pokemon.id)) {
			if (!('LC' in data.pool.Pokemon.tier)) data.pool.Pokemon.tier.LC = [];
			data.pool.Pokemon.tier.LC.push(pokemon.name);
		}

		if (!(pokemon.color in data.pool.Pokemon.color)) data.pool.Pokemon.color[pokemon.color] = [];
		data.pool.Pokemon.color[pokemon.color].push(pokemon.name);

		if (!(pokemon.gen in data.pool.Pokemon.gen)) data.pool.Pokemon.gen[pokemon.gen] = [];
		data.pool.Pokemon.gen[pokemon.gen].push(pokemon.name);

		for (const type of pokemon.types) {
			if (!(type in data.pool.Pokemon.type)) data.pool.Pokemon.type[type] = [];
			data.pool.Pokemon.type[type].push(pokemon.name);
		}

		for (const eggGroup of pokemon.eggGroups) {
			if (!(eggGroup in data.pool.Pokemon.egggroup)) data.pool.Pokemon.egggroup[eggGroup] = [];
			data.pool.Pokemon.egggroup[eggGroup].push(pokemon.name);
		}
	}

	loadedData = true;
}

function search(options: IPortmanteausSearchMessage, prng: PRNG): IPortmanteausResponse {
	const customPort = options.customPortTypes || options.customPortCategories || options.customPortDetails ? true : false;
	let answerParts: Dict<{detail: string; part: string}[]> = {};
	const ports: string[] = [];
	let answers: string[] | null = null;
	let depth = 0;
	let attempts = 0;
	const maxAttempts = 100;
	while (attempts < maxAttempts) {
		attempts++;
		const portLists: {list: string[]; port: string; detail: string}[] = [];
		for (let i = 0; i < options.numberOfPorts; i++) {
			let type: PoolType;
			if (options.customPortTypes) {
				type = options.customPortTypes[i];
			} else {
				type = Tools.sampleOne(portTypes, prng);
			}
			let category;
			if (options.customPortCategories) {
				category = options.customPortCategories[i];
			} else {
				category = Tools.sampleOne(data.portCategories[type], prng);
			}
			const pool = data.pool[type][category];
			let detail;
			if (options.customPortDetails) {
				detail = options.customPortDetails[i];
			} else {
				detail = Tools.sampleOne(Object.keys(pool), prng);
			}
			let port = '[';
			if (category === 'type') {
				/*
				if (type === 'Item') {
					port += detail;
				} else {
				*/
				port += detail + " Type " + type.charAt(0).toUpperCase() + type.substr(1);
			} else if (category === 'gen') {
				port += "Gen " + detail + " " + type.charAt(0).toUpperCase() + type.substr(1);
			} else if (category === 'egggroup') {
				port += detail + " Group " + type.charAt(0).toUpperCase() + type.substr(1);
			} else {
				port += detail + " " + type.charAt(0).toUpperCase() + type.substr(1);
			}
			port += ']';
			portLists.push({list: pool[detail], port, detail});
		}
		if (!customPort) portLists.sort((a, b) => b.list.length - a.list.length);
		let baseAnswers = portLists[0].list;
		let baseLen = baseAnswers.length;
		answerParts = {};
		depth = 0;
		for (let i = 1; i < portLists.length; i++) {
			depth++;
			const list = portLists[i].list;
			const listLen = list.length;
			const detail = portLists[i].detail;
			const tempAnswers: string[] = [];
			for (let a = 0; a < baseLen; a++) {
				const base = baseAnswers[a];
				const baseId = Tools.toId(base);
				if (!(baseId in answerParts)) answerParts[baseId] = [{detail: portLists[0].detail, part: base}];
				for (let b = 0; b < listLen; b++) {
					if (list[b] === base || list[b] === answerParts[baseId][depth - 1].part) continue;
					const additionId = Tools.toId(list[b]);
					for (let j = options.maxLetters; j >= options.minLetters; j--) {
						if (j > baseId.length || j > additionId.length) continue;
						if (baseId.substr(-j) === additionId.substr(0, j)) {
							const combination = baseId + additionId.substr(j);
							answerParts[combination] = answerParts[baseId].slice();
							answerParts[combination].push({detail, part: list[b]});
							tempAnswers.push(combination);
							break;
						}
					}
				}
			}
			baseAnswers = tempAnswers;
			baseLen = baseAnswers.length;
			if (!baseLen) break;
		}
		if (baseLen >= 2) {
			answers = baseAnswers;
			for (const list of portLists) {
				ports.push(list.port);
			}
			break;
		} else {
			if (customPort) return {answers: [], ports: [], answerParts: {}, prngSeed: prng.seed.slice() as PRNGSeed};
		}
	}

	if (!answers) return search(options, prng);

	const formattedAnswerParts: Dict<string[]> = {};
	for (const combination in answerParts) {
		if (!answers.includes(combination)) continue;
		const parts = answerParts[combination];
		formattedAnswerParts[combination] = [];
		for (const part of parts) {
			let name = part.part;
			if (part.detail === 'Berry') {
				name += " Berry";
			} else if (part.detail === 'Drive') {
				name += " Drive";
			} else if (part.detail === 'Plate') {
				name += " Plate";
			}
			formattedAnswerParts[combination].push(name);
		}
	}
	return {answers, ports, answerParts: formattedAnswerParts, prngSeed: prng.seed.slice() as PRNGSeed};
}

worker_threads.parentPort!.on('message', (incomingMessage: string) => {
	loadData();

	const parts = incomingMessage.split("|");
	const messageNumber = parts[0];
	const id = parts[1] as PortmanteausId;
	const message = parts.slice(2).join("|");
	const unref = id === 'unref';
	let response: IPortmanteausResponse | null = null;
	try {
		if (id === 'initialize-thread') {
			// @ts-expect-error
			response = {data};
		} else if (id === 'memory-usage') {
			const memUsage = process.memoryUsage();
			// @ts-expect-error
			response = [memUsage.rss, memUsage.heapUsed, memUsage.heapTotal];
		} else if (unref) {
			Tools.unrefProperties(workerData);
			Tools.unrefProperties(global.Tools);
			// @ts-expect-error
			response = {data};
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		} else if (id === 'search') {
			const options = JSON.parse(message) as IPortmanteausSearchMessage;
			const prng = new PRNG(options.prngSeed);
			response = search(options, prng);
			prng.destroy();
		}
	} catch (e) {
		console.log(e);
		Tools.logException(e as NodeJS.ErrnoException, "Incoming message: " + incomingMessage);
	}

	worker_threads.parentPort!.postMessage(messageNumber + "|" + id + "|" + JSON.stringify(response || ""));
	if (unref) worker_threads.parentPort!.removeAllListeners();
});
