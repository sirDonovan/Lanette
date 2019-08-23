import worker_threads = require('worker_threads');

import { PRNG, PRNGSeed } from '../../prng';
import * as tools from '../../tools';
import { IPortmanteauSearchOptions, IPortmanteauSearchResult, IPortmanteausWorkerData, PoolType } from '../portmanteaus';

const Tools = new tools.Tools();
const data = worker_threads.workerData as IPortmanteausWorkerData;
const portTypes = Object.keys(data.pool) as PoolType[];

function search(options: IPortmanteauSearchOptions, prng: PRNG): IPortmanteauSearchResult {
	const customPort = options.customPortTypes || options.customPortCategories || options.customPortDetails ? true : false;
	let answerParts: Dict<{detail: string, part: string}[]> = {};
	const ports: string[] = [];
	let answers: string[] | null = null;
	let depth = 0;
	let attempts = 0;
	const maxAttempts = 100;
	while (attempts < maxAttempts) {
		attempts++;
		const portLists: {list: string[], port: string, detail: string}[] = [];
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
				if (type === 'Item') {
					port += detail;
				} else {
					port += detail + " Type " + type.charAt(0).toUpperCase() + type.substr(1);
				}
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
			for (let i = 0; i < portLists.length; i++) {
				ports.push(portLists[i].port);
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
		for (let i = 0; i < parts.length; i++) {
			let part = parts[i].part;
			if (parts[i].detail === 'Berry') {
				part += " Berry";
			} else if (parts[i].detail === 'Drive') {
				part += " Drive";
			} else if (parts[i].detail === 'Plate') {
				part += " Plate";
			}
			formattedAnswerParts[combination].push(part);
		}
	}
	return {answers, ports, answerParts: formattedAnswerParts, prngSeed: prng.seed.slice() as PRNGSeed};
}

worker_threads.parentPort!.on('message', message => {
	const pipeIndex = message.indexOf('|');
	const request = message.substr(0, pipeIndex);
	if (request === 'search') {
		const options = JSON.parse(message.substr(pipeIndex + 1)) as IPortmanteauSearchOptions;
		const prng = new PRNG(options.prngSeed);
		worker_threads.parentPort!.postMessage(search(options, prng));
	}
});
