import path = require('path');
import worker_threads = require('worker_threads');
import { PRNGSeed } from '../prng';

export interface IParam {
	type: string;
	param: string;
}

export interface IParamType {
	ability: any;
	color: any;
	egggroup: any;
	gen: any;
	letter: any;
	move: any;
	resistance: any;
	tier: any;
	type: any;
	weakness: any;
}
export type ParamType = keyof IParamType;

export interface IParametersGenData {
	readonly evolutionLines: string[];
	readonly formes: Dict<string>;
	readonly paramTypePools: KeyedDict<IParamType, Dict<IParam>>;
	readonly paramTypeDexes: KeyedDict<IParamType, Dict<string[]>>;
	readonly otherFormes: Dict<string>;
}

export interface IParametersWorkerData {
	readonly pokemon: {gens: Dict<IParametersGenData>};
}

export interface IParameterSearchOptions {
	readonly mod: string;
	readonly numberOfParams: number;
	readonly minimumResults: number;
	readonly maximumResults: number;
	readonly paramTypes: ParamType[];
	readonly prngSeed: PRNGSeed;
	readonly searchType: keyof typeof data;
	readonly customParamTypes?: ParamType[] | null;
	readonly filter?: string[];
}

export interface IParameterIntersectOptions {
	readonly mod: string;
	readonly paramTypes: ParamType[];
	readonly searchType: keyof typeof data;
}

export interface IParameterSearchRequest extends IParameterSearchOptions {
	requestNumber: number;
}

export interface IParameterIntersectRequest extends IParameterIntersectOptions {
	requestNumber: number;
}

export interface IParameterSearchResult {
	params: IParam[];
	pokemon: string[];
	prngSeed: PRNGSeed;
}

export interface IParameterIntersectResult {
	params: IParam[];
	pokemon: string[];
}

export interface IParameterSearchResponse extends IParameterSearchResult {
	requestNumber: number;
}

export interface IParameterIntersectResponse extends IParameterIntersectResult {
	requestNumber: number;
}

interface IParameterSearchQueueItem {
	resolve: (value?: IParameterSearchResult | PromiseLike<IParameterSearchResult> | undefined) => void;
	requestNumber: number;
}

interface IParameterIntersectQueueItem {
	resolve: (value?: IParameterIntersectResult | PromiseLike<IParameterIntersectResult> | undefined) => void;
	requestNumber: number;
}

export const data: IParametersWorkerData = {
	pokemon: {
		gens: {},
	},
};

let requestNumber = 0;
const requestQueue: (IParameterIntersectQueueItem | IParameterSearchQueueItem)[] = [];
let worker: worker_threads.Worker | undefined;

export function init(): worker_threads.Worker {
	if (worker) return worker;

	// only current gen until performance can be improved
	for (let i = 7; i <= 7; i++) {
		const gen = i;
		const genString = 'gen' + i;
		const dex = Dex.getDex(genString);

		const evolutionLines: string[] = [];
		const formes: Dict<string> = {};
		const otherFormes: Dict<string> = {};
		const learnsets: Dict<Dict<readonly string[]>> = {};

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
		for (const i in dex.data.typeChart) {
			if (dex.data.typeChart[i] !== null) typeChartKeys.push(i);
		}

		const pokedex = dex.getPokemonList();
		for (let i = 0; i < pokedex.length; i++) {
			const pokemon = pokedex[i];
			if (pokemon.forme) formes[pokemon.id] = pokemon.forme;
			if (pokemon.baseSpecies !== pokemon.species) otherFormes[pokemon.id] = pokemon.baseSpecies;
			if (pokemon.learnset) {
				learnsets[pokemon.id] = pokemon.learnset;
			} else if (pokemon.baseSpecies !== pokemon.species) {
				const baseSpecies = dex.getExistingPokemon(pokemon.baseSpecies);
				if (baseSpecies.learnset) learnsets[pokemon.id] = baseSpecies.learnset;
			}
			if (pokemon.evos.length && !pokemon.prevo) {
				const pokemonEvolutionLines = dex.getEvolutionLines(pokemon);
				for (let i = 0; i < pokemonEvolutionLines.length; i++) {
					evolutionLines.push(pokemonEvolutionLines[i].map(x => Tools.toId(x)).sort().join(","));
				}
			}

			const letter = pokemon.species.charAt(0);
			const letterId = Tools.toId(letter);
			if (!(letterId in letters)) letters[letterId] = {type: 'letter', param: letter};
			if (!(letter in letterDex)) letterDex[letter] = [];
			letterDex[letter].push(pokemon.species);

			const colorId = Tools.toId(pokemon.color);
			if (!(colorId in colors)) colors[colorId] = {type: 'color', param: pokemon.color};
			if (!(pokemon.color in colorDex)) colorDex[pokemon.color] = [];
			colorDex[pokemon.color].push(pokemon.species);

			for (let i = 0; i < pokemon.types.length; i++) {
				const type = pokemon.types[i];
				const typeId = Tools.toId(type);
				const typeParam = {type: 'type', param: type};
				if (!(typeId in types)) {
					types[typeId] = typeParam;
					types[typeId + 'type'] = typeParam;
				}
				if (!(type in typeDex)) typeDex[type] = [];
				typeDex[type].push(pokemon.species);
			}

			for (let i = 0; i < typeChartKeys.length; i++) {
				const type = typeChartKeys[i];
				const typeId = Tools.toId(type);
				const immune = dex.isImmune(type, pokemon);
				let effectiveness = 0;
				if (!immune) effectiveness = dex.getEffectiveness(type, pokemon);
				if (effectiveness >= 1) {
					if (!(typeId in weaknesses)) {
						const weaknessParam = {type: 'weakness', param: type};
						weaknesses[typeId] = weaknessParam;
						weaknesses['weak' + typeId] = weaknessParam;
						weaknesses['weak' + typeId + 'type'] = weaknessParam;
						weaknesses['weakto' + typeId] = weaknessParam;
						weaknesses['weakto' + typeId + 'type'] = weaknessParam;
					}
					if (!(type in weaknessesDex)) weaknessesDex[type] = [];
					weaknessesDex[type].push(pokemon.species);
				} else if (immune || effectiveness <= -1) {
					if (!(typeId in resistances)) {
						const resistanceParam = {type: 'resistance', param: type};
						resistances[typeId] = resistanceParam;
						resistances['resists' + typeId] = resistanceParam;
						resistances['resists' + typeId + 'type'] = resistanceParam;
						resistances['resist' + typeId] = resistanceParam;
						resistances['resist' + typeId + 'type'] = resistanceParam;
					}
					if (!(type in resistancesDex)) resistancesDex[type] = [];
					resistancesDex[type].push(pokemon.species);
				}
			}

			if (pokemon.tier !== 'Illegal') {
				if (pokemon.tier.charAt(0) !== '(') {
					const tierId = Tools.toId(pokemon.tier);
					if (!(tierId in tiers)) tiers[tierId] = {type: 'tier', param: pokemon.tier};
					if (!(pokemon.tier in tierDex)) tierDex[pokemon.tier] = [];
					tierDex[pokemon.tier].push(pokemon.species);
				}

				if (pokemon.pseudoLC) {
					if (!tiers['lc']) tiers['lc'] = {type: 'tier', param: 'LC'};
					if (!('LC' in tierDex)) tierDex['LC'] = [];
					tierDex['LC'].push(pokemon.species);
				}
			}

			const genParam = {type: 'gen', param: '' + pokemon.gen};
			if (!(pokemon.gen in gens)) {
				gens[pokemon.gen] = genParam;
				gens['gen' + pokemon.gen] = genParam;
			}
			if (!(pokemon.gen in genDex)) genDex[pokemon.gen] = [];
			genDex[pokemon.gen].push(pokemon.species);

			for (const i in pokemon.abilities) {
				// @ts-ignore
				const ability = pokemon.abilities[i] as string;
				const abilityId = Tools.toId(ability);
				if (!(abilityId in abilities)) abilities[abilityId] = {type: 'ability', param: ability};
				if (!(ability in abilityDex)) abilityDex[ability] = [];
				abilityDex[ability].push(pokemon.species);
			}

			for (let i = 0; i < pokemon.eggGroups.length; i++) {
				const group = pokemon.eggGroups[i];
				const groupId = Tools.toId(group);
				const groupParam = {type: 'egggroup', param: group};
				if (!(groupId in eggGroups)) {
					eggGroups[groupId] = groupParam;
					eggGroups[groupId + 'group'] = groupParam;
				}
				if (!(group in eggGroupDex)) eggGroupDex[group] = [];
				eggGroupDex[group].push(pokemon.species);
			}
		}

		tiers['ubers'] = tiers['uber'];

		const format = dex.getExistingFormat(genString + 'ou');
		const movesList = dex.getMovesList();
		for (let i = 0; i < movesList.length; i++) {
			const move = movesList[i];
			const moveParam = {type: 'move', param: move.name};
			if (move.id.startsWith('hiddenpower')) {
				moves[Tools.toId(move.name)] = moveParam;
			} else {
				moves[move.id] = moveParam;
			}
			for (let i = 0; i < pokedex.length; i++) {
				const pokemon = pokedex[i];
				if (!dex.checkLearnset(move, pokemon, {fastCheck: true, sources: [], sourcesBefore: gen}, {format})) {
					if (!(move.name in moveDex)) moveDex[move.name] = [];
					moveDex[move.name].push(pokemon.species);
				}
			}
		}

		data.pokemon.gens[genString] = {
			evolutionLines,
			formes,
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

	worker = new worker_threads.Worker(path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1)), {workerData: data});
	worker.on('message', (message: string) => {
		const pipeIndex = message.indexOf('|');
		const result: IParameterSearchResponse | IParameterIntersectResponse = JSON.parse(message.substr(pipeIndex + 1));
		for (let i = 0; i < requestQueue.length; i++) {
			if (requestQueue[i].requestNumber === result.requestNumber) {
				// @ts-ignore
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

export function search(options: IParameterSearchOptions): Promise<IParameterSearchResult> {
	return (new Promise(resolve => {
		const request: IParameterSearchRequest = Object.assign({}, options, {requestNumber});
		requestQueue.push({resolve, requestNumber});
		requestNumber++;
		worker!.postMessage('search|' + JSON.stringify(request));
	}));
}

export function intersect(options: IParameterIntersectOptions, parts: string[]): Promise<IParameterIntersectResult> {
	const paramTypePools = data[options.searchType].gens[options.mod].paramTypePools;
	const params: IParam[] = [];
	for (let i = 0; i < parts.length; i++) {
		const part = Tools.toId(parts[i]);
		let param: IParam | undefined;
		for (let i = 0; i < options.paramTypes.length; i++) {
			if (part in paramTypePools[options.paramTypes[i]]) {
				param = paramTypePools[options.paramTypes[i]][part];
				break;
			}
		}
		if (!param) return Promise.resolve({params: [], pokemon: []});
		params.push(param);
	}

	return (new Promise(resolve => {
		const request: IParameterIntersectRequest = Object.assign({}, options, {requestNumber});
		requestQueue.push({resolve, requestNumber});
		requestNumber++;
		worker!.postMessage('intersect|' + JSON.stringify(request) + '|' + JSON.stringify(params));
	}));
}
