// eslint-disable-next-line @typescript-eslint/naming-convention
import worker_threads = require('worker_threads');

import type { PRNGSeed } from '../../lib/prng';
import { PRNG } from '../../lib/prng';
import * as tools from '../../tools';
import type { IPortmanteausResponse, IPortmanteausSearchMessage, IPortmanteausWorkerData, PoolType, PortmanteausId } from '../portmanteaus';

// eslint-disable-next-line @typescript-eslint/naming-convention
const Tools = new tools.Tools();
// eslint-disable-next-line @typescript-eslint/naming-convention
const data = worker_threads.workerData as IPortmanteausWorkerData;
const portTypes = Object.keys(data.pool) as PoolType[];

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

// eslint-disable-next-line @typescript-eslint/naming-convention
worker_threads.parentPort!.on('message', (incommingMessage: string) => {
	const parts = incommingMessage.split("|");
	const messageNumber = parts[0];
	const id = parts[1] as PortmanteausId;
	const message = parts.slice(2).join("|");
	let response: IPortmanteausResponse | null = null;
	try {
		if (id === 'search') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			const options = JSON.parse(message) as IPortmanteausSearchMessage;
			const prng = new PRNG(options.prngSeed);
			response = search(options, prng);
		}
	} catch (e) {
		console.log(e);
		Tools.logError(e);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	worker_threads.parentPort!.postMessage(messageNumber + "|" + id + "|" + JSON.stringify(response || ""));
});
