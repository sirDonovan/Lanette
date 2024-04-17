import worker_threads = require('worker_threads');

import type { PRNGSeed } from '../../lib/prng';
import { PRNG } from '../../lib/prng';
import * as tools from '../../tools';
import type {
	IParam, IParametersIntersectMessage, IParametersIntersectOptions, IParametersResponse, IParametersSearchMessage,
	IParametersSearchOptions, IParametersThreadData, IParametersWorkerData, ParametersId, ParamType
} from '../parameters';
import { IMove, IPokemon, ITypeData } from '../../types/pokemon-showdown';

tools.instantiate();

const workerData = worker_threads.workerData as DeepImmutable<IParametersWorkerData>;

const data: IParametersThreadData = {
	pokemon: {
		gens: {},
	},
};

const paramTypeDexesKeys: Dict<Dict<KeyedDict<ParamType, readonly string[]>>> = {};
const searchTypes: (keyof typeof data)[] = ['pokemon'];
const effectivenessCache: Dict<Dict<number>> = Object.create(null); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
const immunityCache: Dict<Dict<boolean>> = Object.create(null); // eslint-disable-line @typescript-eslint/no-unsafe-assignment

let loadedData = false;
function loadData(): void {
	if (loadedData) return;

	/* eslint-disable @typescript-eslint/dot-notation */
	const currentGen = workerData.currentGen;
	for (let gen = 1; gen <= currentGen; gen++) {
		const mod = 'gen' + gen;

		const evolutionLines: string[] = [];
		const formes: Dict<string> = {};
		const gigantamax: string[] = [];
		const otherFormes: Dict<string> = {};

		const letters: Dict<IParam> = {};
		const colors: Dict<IParam> = {};
		const gens: Dict<IParam> = {};
		const types: Dict<IParam> = {};
		const tiers: Dict<IParam> = {};
		const moves: Dict<IParam> = {};
		const abilities: Dict<IParam> = {};
		const eggGroups: Dict<IParam> = {};
		const resistances: Dict<IParam> = {};
		const weaknesses: Dict<IParam> = {};

		const letterDex: Dict<string[]> = {};
		const colorDex: Dict<string[]> = {};
		const typeDex: Dict<string[]> = {};
		const tierDex: Dict<string[]> = {};
		const genDex: Dict<string[]> = {};
		const moveDex: Dict<string[]> = {};
		const abilityDex: Dict<string[]> = {};
		const eggGroupDex: Dict<string[]> = {};
		const weaknessesDex: Dict<string[]> = {};
		const resistancesDex: Dict<string[]> = {};

		const typeChartKeys: string[] = [];
		for (const i in workerData.types[gen]) {
			typeChartKeys.push(workerData.types[gen][i]!.name);
		}

		const allPossibleMoves: Dict<readonly string[]> = {};
		const pokedex = workerData.pokemonLists[gen];
		for (const pokemon of pokedex) {
			allPossibleMoves[pokemon.id] = workerData.allPossibleMoves[gen][pokemon.id];

			if (pokemon.forme) formes[pokemon.id] = pokemon.forme;
			if (pokemon.baseSpecies !== pokemon.name) otherFormes[pokemon.id] = pokemon.baseSpecies;
			if (pokemon.isNonstandard === 'Gigantamax') gigantamax.push(pokemon.name);

			if (pokemon.evos.length && !pokemon.prevo) {
				const pokemonEvolutionLines = workerData.evolutionLines[gen][pokemon.id];
				for (const line of pokemonEvolutionLines) {
					evolutionLines.push(line.map(x => Tools.toId(x)).sort().join(","));
				}
			}

			const letter = pokemon.name.charAt(0);
			const letterId = Tools.toId(letter);
			if (!(letterId in letters)) {
				const letterParam = {type: 'letter' as ParamType, param: letter};
				letters[letterId] = letterParam;
				letters[letterId + 'letter'] = letterParam;
			}
			if (!(letter in letterDex)) letterDex[letter] = [];
			letterDex[letter].push(pokemon.name);

			const colorId = Tools.toId(pokemon.color);
			if (!(colorId in colors)) {
				const colorParam = {type: 'color' as ParamType, param: pokemon.color};
				colors[colorId] = colorParam;
				colors[colorId + 'color'] = colorParam;
			}
			if (!(pokemon.color in colorDex)) colorDex[pokemon.color] = [];
			colorDex[pokemon.color].push(pokemon.name);

			for (const type of pokemon.types) {
				const typeId = Tools.toId(type);
				const typeParam = {type: 'type' as ParamType, param: type};
				if (!(typeId in types)) {
					types[typeId] = typeParam;
					types[typeId + 'type'] = typeParam;
				}
				if (!(type in typeDex)) typeDex[type] = [];
				typeDex[type].push(pokemon.name);
			}

			for (const type of typeChartKeys) {
				const typeId = Tools.toId(type);
				const immune = isImmune(type, pokemon, workerData.types[gen]);
				let effectiveness = 0;
				if (!immune) effectiveness = getEffectiveness(type, pokemon, workerData.types[gen]);
				if (effectiveness >= 1) {
					if (!(typeId in weaknesses)) {
						const weaknessParam = {type: 'weakness' as ParamType, param: type};
						weaknesses[typeId] = weaknessParam;
						weaknesses[typeId + 'weakness'] = weaknessParam;
						weaknesses['weak' + typeId] = weaknessParam;
						weaknesses['weak' + typeId + 'type'] = weaknessParam;
						weaknesses['weakto' + typeId] = weaknessParam;
						weaknesses['weakto' + typeId + 'type'] = weaknessParam;
					}
					if (!(type in weaknessesDex)) weaknessesDex[type] = [];
					weaknessesDex[type].push(pokemon.name);
				} else if (immune || effectiveness <= -1) {
					if (!(typeId in resistances)) {
						const resistanceParam = {type: 'resistance' as ParamType, param: type};
						resistances[typeId] = resistanceParam;
						resistances[typeId + 'resistance'] = resistanceParam;
						resistances['resists' + typeId] = resistanceParam;
						resistances['resists' + typeId + 'type'] = resistanceParam;
						resistances['resist' + typeId] = resistanceParam;
						resistances['resist' + typeId + 'type'] = resistanceParam;
					}
					if (!(type in resistancesDex)) resistancesDex[type] = [];
					resistancesDex[type].push(pokemon.name);
				}
			}

			if (!workerData.excludedTiers.includes(pokemon.tier)) {
				const tierId = Tools.toId(pokemon.tier);
				if (!(tierId in tiers)) {
					const tierParam = {type: 'tier' as ParamType, param: pokemon.tier};
					tiers[tierId] = tierParam;
					tiers[tierId + 'tier'] = tierParam;
				}
				if (!(pokemon.tier in tierDex)) tierDex[pokemon.tier] = [];
				tierDex[pokemon.tier].push(pokemon.name);
			}

			if (workerData.pseudoLCPokemon[gen].includes(pokemon.id)) {
				if (!('lc' in tiers)) {
					const tierParam = {type: 'tier' as ParamType, param: 'LC'};
					tiers['lc'] = tierParam;
					tiers['lctier'] = tierParam;
				}
				if (!('LC' in tierDex)) tierDex['LC'] = [];
				tierDex['LC'].push(pokemon.name);
			}

			if (!(pokemon.gen in gens)) {
				const genParam = {type: 'gen' as ParamType, param: '' + pokemon.gen};
				gens[pokemon.gen] = genParam;
				gens['gen' + pokemon.gen] = genParam;
				gens['g' + pokemon.gen] = genParam;
			}
			if (!(pokemon.gen in genDex)) genDex[pokemon.gen] = [];
			genDex[pokemon.gen].push(pokemon.name);

			for (const i in pokemon.abilities) {
				// @ts-expect-error
				const ability = pokemon.abilities[i] as string;
				const abilityId = Tools.toId(ability);
				if (!(abilityId in abilities)) {
					abilities[abilityId] = {type: 'ability', param: ability};
					abilities[abilityId + 'ability'] = {type: 'ability', param: ability};
				}
				if (!(ability in abilityDex)) abilityDex[ability] = [];
				abilityDex[ability].push(pokemon.name);
			}

			for (const eggGroup of pokemon.eggGroups) {
				const groupId = Tools.toId(eggGroup);
				const groupParam = {type: 'egggroup' as ParamType, param: eggGroup};
				if (!(groupId in eggGroups)) {
					eggGroups[groupId] = groupParam;
					eggGroups[groupId + 'group'] = groupParam;
				}
				if (!(eggGroup in eggGroupDex)) eggGroupDex[eggGroup] = [];
				eggGroupDex[eggGroup].push(pokemon.name);
			}
		}

		tiers['ubers'] = tiers['uber'];

		const movesList = workerData.moveLists[gen];
		for (const move of movesList) {
			let possibleMove = false;
			for (const pokemon of pokedex) {
				if (allPossibleMoves[pokemon.id].includes(move.id)) {
					if (!possibleMove) possibleMove = true;

					if (!(move.name in moveDex)) moveDex[move.name] = [];
					moveDex[move.name].push(pokemon.name);
				}
			}

			if (possibleMove) {
				const moveParam = {type: 'move' as ParamType, param: move.name};
				if (move.id.startsWith('hiddenpower')) {
					const id = Tools.toId(move.name);
					moves[id] = moveParam;
					moves[id + 'move'] = moveParam;
				} else {
					moves[move.id] = moveParam;
					moves[move.id + 'move'] = moveParam;
				}
			}
		}

		data.pokemon.gens[mod] = {
			evolutionLines,
			formes,
			gigantamax,
			paramTypePools: {
				'move': moves,
				'ability': abilities,
				'color': colors,
				'type': types,
				'tier': tiers,
				'gen': gens,
				'egggroup': eggGroups,
				'resistance': resistances,
				'weakness': weaknesses,
				'letter': letters,
			},
			paramTypeDexes: {
				'move': moveDex,
				'ability': abilityDex,
				'color': colorDex,
				'type': typeDex,
				'tier': tierDex,
				'gen': genDex,
				'egggroup': eggGroupDex,
				'resistance': resistancesDex,
				'weakness': weaknessesDex,
				'letter': letterDex,
			},
			otherFormes,
		};
	}
	/* eslint-enable */

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

	loadedData = true;
}

function isImmune(source: IMove | string, target: string | readonly string[] | IPokemon, types: Dict<ITypeData | undefined>): boolean {
	const sourceType = typeof source === 'string' ? source : source.type;
	let targetType: string | readonly string[];
	if (typeof target === 'string') {
		targetType = target;
	} else if (Array.isArray(target)) {
		targetType = target;
	} else {
		targetType = (target as IPokemon).types;
	}

	if (Array.isArray(targetType)) {
		targetType = targetType as readonly string[];
		const cacheKey = targetType.join(',');
		if (!Object.prototype.hasOwnProperty.call(immunityCache, sourceType)) {
			immunityCache[sourceType] = {};
		} else if (Object.prototype.hasOwnProperty.call(immunityCache[sourceType], cacheKey)) {
			return immunityCache[sourceType][cacheKey];
		}

		for (const type of targetType) {
			if (isImmune(sourceType, type, types)) {
				immunityCache[sourceType][cacheKey] = true;
				return true;
			}
		}

		immunityCache[sourceType][cacheKey] = false;
		return false;
	} else {
		targetType = targetType as string;
		if (!Object.prototype.hasOwnProperty.call(immunityCache, sourceType)) {
			immunityCache[sourceType] = {};
		} else if (Object.prototype.hasOwnProperty.call(immunityCache[sourceType], targetType)) {
			return immunityCache[sourceType][targetType];
		}

		const typeData = types[Tools.toId(targetType)];
		if (typeData && typeData.damageTaken[sourceType] === 3) {
			immunityCache[sourceType][targetType] = true;
			return true;
		}

		immunityCache[sourceType][targetType] = false;
		return false;
	}
}

/**
 * Returns >=1 if super-effective, <=1 if not very effective
 */
function getEffectiveness(source: IMove | string, target: IPokemon | string | readonly string[],
	types: Dict<ITypeData | undefined>): number {
	const sourceType = typeof source === 'string' ? source : source.type;
	let targetType: string | readonly string[];
	if (typeof target === 'string') {
		targetType = target;
	} else if (Array.isArray(target)) {
		targetType = target;
	} else {
		targetType = (target as IPokemon).types;
	}

	if (Array.isArray(targetType)) {
		targetType = targetType as readonly string[];
		const cacheKey = targetType.join(',');
		if (!Object.prototype.hasOwnProperty.call(effectivenessCache, sourceType)) {
			effectivenessCache[sourceType] = {};
		} else if (Object.prototype.hasOwnProperty.call(effectivenessCache[sourceType], cacheKey)) {
			return effectivenessCache[sourceType][cacheKey];
		}

		let totalTypeMod = 0;
		for (const type of targetType) {
			totalTypeMod += getEffectiveness(sourceType, type, types);
		}

		effectivenessCache[sourceType][cacheKey] = totalTypeMod;
		return totalTypeMod;
	} else {
		targetType = targetType as string;
		if (!Object.prototype.hasOwnProperty.call(effectivenessCache, sourceType)) {
			effectivenessCache[sourceType] = {};
		} else if (Object.prototype.hasOwnProperty.call(effectivenessCache[sourceType], targetType)) {
			return effectivenessCache[sourceType][targetType];
		}

		const typeData = types[Tools.toId(targetType)];
		let effectiveness: number;
		if (typeData) {
			switch (typeData.damageTaken[sourceType]) {
			// super-effective
			case 1: {
				effectiveness = 1;
				break;
			}

			// resist
			case 2: {
				effectiveness = -1;
				break;
			}

			default: {
				effectiveness = 0;
			}
			}
		} else {
			effectiveness = 0;
		}

		effectivenessCache[sourceType][targetType] = effectiveness;
		return effectiveness;
	}
}

function intersect(options: IParametersIntersectOptions): string[] {
	return Tools.intersectParams(options.searchType, options.params, data[options.searchType].gens[options.mod]);
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
	const searchingPokemon = options.searchType === 'pokemon'; // eslint-disable-line @typescript-eslint/no-unnecessary-condition
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
			if (!(paramType in possibleKeys)) {
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

worker_threads.parentPort!.on('message', (incomingMessage: string) => {
	loadData();

	const parts = incomingMessage.split("|");
	const messageNumber = parts[0];
	const id = parts[1] as ParametersId;
	const message = parts.slice(2).join("|");
	const unref = id === 'unref';
	let response: IParametersResponse | null = null;
	try {
		if (id === 'initialize-thread') {
			response = {params: [], pokemon: [], data};
		} else if (id === 'memory-usage') {
			const memUsage = process.memoryUsage();
			// @ts-expect-error
			response = [memUsage.rss, memUsage.heapUsed, memUsage.heapTotal];
		} else if (unref) {
			Tools.unrefProperties(workerData);
			Tools.unrefProperties(global.Tools);
			response = {params: [], pokemon: [], data};
		} else if (id === 'search') {
			const options = JSON.parse(message) as IParametersSearchMessage;
			const prng = new PRNG(options.prngSeed);
			response = search(options, prng);
			prng.destroy();
		} else if (id === 'intersect') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			const options = JSON.parse(message) as IParametersIntersectMessage;
			response = {params: options.params, pokemon: intersect(options)};
		}
	} catch (e) {
		console.log(e);
		Tools.logException(e as NodeJS.ErrnoException, "Incoming message: " + incomingMessage);
	}

	worker_threads.parentPort!.postMessage(messageNumber + "|" + id + "|" + JSON.stringify(response || ""));
	if (unref) worker_threads.parentPort!.removeAllListeners();
});
