import worker_threads = require('worker_threads');

import { PRNG, PRNGSeed } from '../../prng';
import * as tools from '../../tools';
import { IParam, IParameterIntersectOptions, IParameterSearchOptions, IParameterSearchResult, IParametersWorkerData } from '../parameters';

const Tools = new tools.Tools();
const data = worker_threads.workerData as IParametersWorkerData;
const paramTypeKeys: Dict<Dict<Dict<string[]>>> = {};
const searchTypes: (keyof typeof data)[] = ['pokemon'];
for (let i = 0; i < searchTypes.length; i++) {
	const searchType = searchTypes[i];
	paramTypeKeys[searchType] = {};
	for (const gen in data[searchType].gens) {
		paramTypeKeys[searchType][gen] = {};
		for (const i in data[searchType].gens[gen].paramTypeDexes) {
			paramTypeKeys[searchType][gen][i] = Object.keys(data[searchType].gens[gen].paramTypeDexes[i]);
		}
	}
}

function search(options: IParameterSearchOptions, prng: PRNG): IParameterSearchResult {
	let paramTypes: string[] = [];
	let pokemon: string[] = [];
	let params: IParam[] = [];
	let possibleParams: string[][] = [];
	let paramPools: {[k: string]: IParam}[] = [];
	let paramLists: string[][] = [];
	let paramCombinations: string[][] = [];
	let tempCombinations: string[][] = [];
	const searchingPokemon = options.searchType === 'pokemon';
	let validParams = false;

	while (!validParams) {
		if (options.customParamTypes) {
			paramTypes = options.customParamTypes;
		} else {
			paramTypes = Tools.sampleMany(options.paramTypes, options.numberOfParams, prng);
			while (paramTypes.includes('resistance') && paramTypes.includes('weakness')) {
				paramTypes = Tools.sampleMany(options.paramTypes, options.numberOfParams, prng);
			}
		}

		const possibleKeys: {[k: string]: string[]} = {};
		for (let i = 0; i < paramTypes.length; i++) {
			if (!possibleKeys[paramTypes[i]]) {
				const keys = paramTypeKeys[options.searchType][options.mod][paramTypes[i]];
				const possible: string[] = [];
				for (let j = 0; j < keys.length; j++) {
					if (data[options.searchType].gens[options.mod].paramTypeDexes[paramTypes[i]][keys[j]].length >= options.minimumResults) possible.push(Tools.toId(keys[j]));
				}
				possibleKeys[paramTypes[i]] = possible;
			}
		}

		if (!options.customParamTypes) paramTypes.sort((a, b) => possibleKeys[a].length - possibleKeys[b].length);

		possibleParams = [];
		paramPools = [];
		for (let i = 0; i < paramTypes.length; i++) {
			paramPools.push(data[options.searchType].gens[options.mod].paramTypePools[paramTypes[i]]);
			possibleParams.push(possibleKeys[paramTypes[i]]);
		}
		const possibleParamsLen = possibleParams.length;

		for (let i = 0; i < possibleParamsLen; i++) {
			possibleParams[i] = Tools.shuffle(possibleParams[i], prng);
		}

		paramLists = [];
		for (let i = 0; i < possibleParamsLen; i++) {
			paramLists.push(possibleParams[i].slice());
		}

		let attempts = 0;
		let maxAttempts = 0;
		if (!options.customParamTypes) {
			maxAttempts = paramLists[possibleParamsLen - 1].length;
		}

		paramCombinations = [];
		for (let i = 0; i < paramLists[0].length; i++) {
			paramCombinations.push([paramLists[0][i]]);
		}
		let paramCombinationsLen = paramCombinations.length;
		paramLists.shift();

		outerloop:
		for (let i = 0; i < paramLists.length; i++) {
			const finalCombinations = i === paramLists.length - 1;
			const list = paramLists[i];
			tempCombinations = [];
			for (let i = 0; i < list.length; i++) {
				innerLoop:
				for (let j = 0; j < paramCombinationsLen; j++) {
					const combination = paramCombinations[j].concat([list[i]]);
					if (finalCombinations) {
						if (maxAttempts) {
							if (attempts === maxAttempts) break outerloop;
							attempts++;
						}
						params = [];
						for (let k = 0; k < possibleParamsLen; k++) {
							if (params.includes(paramPools[k][combination[k]])) continue innerLoop;
							params.push(paramPools[k][combination[k]]);
						}
						const intersection = intersect(options, params);
						if (intersection.length >= options.minimumResults && intersection.length <= options.maximumResults && !(searchingPokemon && data.pokemon.gens[options.mod].evolutionLines.includes(intersection.join(",")))) {
							pokemon = intersection;
							validParams = true;
							break outerloop;
						}
					} else {
						tempCombinations.push(combination);
					}
				}
			}
			paramCombinations = tempCombinations;
			paramCombinationsLen = paramCombinations.length;
		}

		if (options.customParamTypes) break;
	}

	if (!validParams && options.customParamTypes) return {params: [], pokemon: [], prngSeed: prng.seed.slice() as PRNGSeed};

	return {params, pokemon, prngSeed: prng.seed.slice() as PRNGSeed};
}

function intersect(options: IParameterIntersectOptions, params: IParam[]): string[] {
	let intersection = Tools.intersectParams(params, data[options.searchType].gens[options.mod].paramTypeDexes);

	if (options.searchType === 'pokemon') {
		const filtered: string[] = [];
		for (let i = 0; i < intersection.length; i++) {
			const id = Tools.toId(intersection[i]);
			const isAlola = data.pokemon.gens[options.mod].formes[id] === 'Alola' && intersection[i] !== "Pikachu-Alola";
			if (!isAlola && id in data.pokemon.gens[options.mod].otherFormes && intersection.includes(data.pokemon.gens[options.mod].otherFormes[id])) continue;
			filtered.push(id);
		}

		intersection = filtered;
	}
	return intersection.sort();
}

worker_threads.parentPort!.on('message', message => {
	let pipeIndex = message.indexOf('|');
	const request = message.substr(0, pipeIndex);
	if (request === 'search') {
		const options = JSON.parse(message.substr(pipeIndex + 1)) as IParameterSearchOptions;
		const prng = new PRNG(options.prngSeed);
		worker_threads.parentPort!.postMessage(search(options, prng));
	} else if (request === 'intersect') {
		message = message.substr(pipeIndex + 1);
		pipeIndex = message.indexOf('|');
		const options = JSON.parse(message.substr(0, pipeIndex));
		const params = JSON.parse(message.substr(pipeIndex + 1));
		worker_threads.parentPort!.postMessage(intersect(options, params));
	}
});
