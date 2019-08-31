import worker_threads = require('worker_threads');

import { PRNG, PRNGSeed } from '../../prng';
import * as tools from '../../tools';
import { IParam, IParameterIntersectRequest, IParameterIntersectResponse, IParameterSearchRequest, IParameterSearchResponse, IParameterSearchResult, IParametersWorkerData, IParamType, ParamType } from '../parameters';

const Tools = new tools.Tools();
const data = worker_threads.workerData as DeepReadonly<IParametersWorkerData>;
const paramTypeKeys: Dict<Dict<KeyedDict<IParamType, readonly string[]>>> = {};
const searchTypes: (keyof typeof data)[] = ['pokemon'];
for (let i = 0; i < searchTypes.length; i++) {
	const searchType = searchTypes[i];
	paramTypeKeys[searchType] = {};
	for (const gen in data[searchType].gens) {
		paramTypeKeys[searchType][gen] = {
			ability: [],
			color: [],
			egggroup: [],
			gen: [],
			letter: [],
			move: [],
			resistance: [],
			tier: [],
			type: [],
			weakness: [],
		};
		const keys = Object.keys(data[searchType].gens[gen].paramTypeDexes) as ParamType[];
		for (let i = 0; i < keys.length; i++) {
			paramTypeKeys[searchType][gen][keys[i]] = Object.keys(data[searchType].gens[gen].paramTypeDexes[keys[i]]);
		}
	}
}

function search(options: IParameterSearchRequest, prng: PRNG): IParameterSearchResult {
	let paramTypes: ParamType[] = [];
	let pokemon: string[] = [];
	let params: IParam[] = [];
	let possibleKeys: Dict<string[]> = {};
	let possibleParams: string[][] = [];
	let paramPools: Dict<IParam>[] = [];
	let paramLists: string[][] = [];
	let paramCombinations: string[][] = [];
	let tempCombinations: string[][] = [];
	let attempts = 0;
	let maxAttempts = 0;
	let possibleParamsLen = 0;
	let paramCombinationsLen = 0;
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

		possibleKeys = {};
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
		possibleParamsLen = possibleParams.length;

		for (let i = 0; i < possibleParamsLen; i++) {
			possibleParams[i] = Tools.shuffle(possibleParams[i], prng);
		}

		paramLists = [];
		for (let i = 0; i < possibleParamsLen; i++) {
			paramLists.push(possibleParams[i].slice());
		}

		attempts = 0;
		maxAttempts = 0;
		if (!options.customParamTypes) {
			maxAttempts = paramLists[possibleParamsLen - 1].length;
		}

		paramCombinations = [];
		for (let i = 0; i < paramLists[0].length; i++) {
			paramCombinations.push([paramLists[0][i]]);
		}
		paramCombinationsLen = paramCombinations.length;
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

function intersect(options: IParameterIntersectRequest, params: IParam[]): string[] {
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
	let reponse: IParameterSearchResponse | IParameterIntersectResponse;
	if (request === 'search') {
		const options = JSON.parse(message.substr(pipeIndex + 1)) as IParameterSearchRequest;
		const prng = new PRNG(options.prngSeed);
		reponse = Object.assign(search(options, prng), {requestNumber: options.requestNumber});
	} else if (request === 'intersect') {
		message = message.substr(pipeIndex + 1);
		pipeIndex = message.indexOf('|');
		const options = JSON.parse(message.substr(0, pipeIndex)) as IParameterIntersectRequest;
		const params = JSON.parse(message.substr(pipeIndex + 1));
		reponse = {params, pokemon: intersect(options, params), requestNumber: options.requestNumber};
	}

	worker_threads.parentPort!.postMessage(request + '|' + JSON.stringify(reponse!));
});
