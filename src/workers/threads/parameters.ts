// eslint-disable-next-line @typescript-eslint/camelcase
import worker_threads = require('worker_threads');

import { PRNG, PRNGSeed } from '../../prng';
import * as tools from '../../tools';
import { IParam, IParametersIntersectMessage, IParametersIntersectOptions, IParametersResponse, IParametersSearchMessage, IParametersSearchOptions, IParametersWorkerData, IParamTypeKeys, ParametersId, ParamType } from '../parameters';

// eslint-disable-next-line @typescript-eslint/naming-convention
const Tools = new tools.Tools();
// eslint-disable-next-line @typescript-eslint/camelcase
const data = worker_threads.workerData as DeepReadonly<IParametersWorkerData>;
const paramTypeDexesKeys: Dict<Dict<KeyedDict<IParamTypeKeys, readonly string[]>>> = {};
const searchTypes: (keyof typeof data)[] = ['pokemon'];
for (const searchType of searchTypes) {
	paramTypeDexesKeys[searchType] = {};
	for (const gen in data[searchType].gens) {
		paramTypeDexesKeys[searchType][gen] = {
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
		for (const key of keys) {
			paramTypeDexesKeys[searchType][gen][key] = Object.keys(data[searchType].gens[gen].paramTypeDexes[key]);
		}
	}
}

function intersect(options: IParametersIntersectOptions): string[] {
	let intersection = Tools.intersectParams(options.params, data[options.searchType].gens[options.mod].paramTypeDexes);

	if (options.searchType === 'pokemon') {
		const filtered: string[] = [];
		for (const slice of intersection) {
			const id = Tools.toId(slice);
			const isAlola = data.pokemon.gens[options.mod].formes[id] === 'Alola' && slice !== "Pikachu-Alola";
			if (!isAlola && id in data.pokemon.gens[options.mod].otherFormes &&
				intersection.includes(data.pokemon.gens[options.mod].otherFormes[id])) continue;
			filtered.push(id);
		}

		intersection = filtered;
	}
	return intersection.sort();
}

function search(options: IParametersSearchOptions, prng: PRNG): IParametersResponse {
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
		for (const paramType of paramTypes) {
			if (!possibleKeys[paramType]) {
				const keys = paramTypeDexesKeys[options.searchType][options.mod][paramType];
				const possible: string[] = [];
				for (const key of keys) {
					if (data[options.searchType].gens[options.mod].paramTypeDexes[paramType][key].length >= options.minimumResults) {
						possible.push(Tools.toId(key));
					}
				}
				possibleKeys[paramType] = possible;
			}
		}

		if (!options.customParamTypes) paramTypes.sort((a, b) => possibleKeys[a].length - possibleKeys[b].length);

		possibleParams = [];
		paramPools = [];
		for (const paramType of paramTypes) {
			paramPools.push(data[options.searchType].gens[options.mod].paramTypePools[paramType]);
			possibleParams.push(possibleKeys[paramType]);
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
		for (const list of paramLists[0]) {
			paramCombinations.push([list]);
		}
		paramCombinationsLen = paramCombinations.length;
		paramLists.shift();

		outerloop:
		for (let i = 0; i < paramLists.length; i++) {
			const finalCombinations = i === paramLists.length - 1;
			const list = paramLists[i];
			tempCombinations = [];
			for (const param of list) {
				innerLoop:
				for (let j = 0; j < paramCombinationsLen; j++) {
					const combination = paramCombinations[j].concat([param]);
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
						const intersection = intersect(Object.assign(options, {params}));
						if (intersection.length >= options.minimumResults && intersection.length <= options.maximumResults &&
							!(searchingPokemon && data.pokemon.gens[options.mod].evolutionLines.includes(intersection.join(",")))) {
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

// eslint-disable-next-line @typescript-eslint/camelcase
worker_threads.parentPort!.on('message', (incommingMessage: string) => {
	const parts = incommingMessage.split("|");
	const messageNumber = parts[0];
	const id = parts[1] as ParametersId;
	const message = parts.slice(2).join("|");
	let response: IParametersResponse;
	if (id === 'search') {
		const options = JSON.parse(message) as IParametersSearchMessage;
		const prng = new PRNG(options.prngSeed);
		response = search(options, prng);
	} else if (id === 'intersect') {
		const options = JSON.parse(message) as IParametersIntersectMessage;
		response = {params: options.params, pokemon: intersect(options)};
	}

	// eslint-disable-next-line @typescript-eslint/camelcase
	worker_threads.parentPort!.postMessage(messageNumber + "|" + id + "|" + JSON.stringify(response!));
});
