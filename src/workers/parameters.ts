import path = require('path');

import type { PRNGSeed } from '../lib/prng';
import type { WorkerBaseMessageId } from './worker-base';
import { WorkerBase } from './worker-base';

export type ParametersId = WorkerBaseMessageId | 'search' | 'intersect';

export type ParamType = 'ability' | 'color' | 'egggroup' | 'gen' | 'letter' | 'move' | 'resistance' | 'tier' | 'type' | 'weakness';

export interface IParam {
	type: ParamType;
	param: string;
}

export interface IParametersGenData {
	readonly evolutionLines: string[];
	readonly formes: Dict<string>;
	readonly gigantamax: string[];
	readonly paramTypePools: KeyedDict<ParamType, Dict<IParam>>;
	readonly paramTypeDexes: KeyedDict<ParamType, Dict<string[]>>;
	readonly otherFormes: Dict<string>;
}

export interface IParametersWorkerData {
	readonly pokemon: {gens: Dict<IParametersGenData>};
}

export type ParametersSearchType = keyof IParametersWorkerData;

export interface IParametersResponse {
	params: IParam[];
	pokemon: string[];
	prngSeed?: PRNGSeed;
}

export interface IParametersSearchOptions {
	readonly mod: string;
	readonly numberOfParams: number;
	readonly minimumResults: number;
	readonly maximumResults: number;
	readonly paramTypes: ParamType[];
	readonly prngSeed: PRNGSeed;
	readonly searchType: keyof IParametersWorkerData;
	readonly customParamTypes?: ParamType[] | null;
	readonly filter?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IParametersSearchMessage extends IParametersSearchOptions {}

export interface IParametersIntersectOptions {
	readonly mod: string;
	readonly params: IParam[];
	readonly paramTypes: ParamType[];
	readonly searchType: ParametersSearchType;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IParametersIntersectMessage extends IParametersIntersectOptions {}

export class ParametersWorker extends WorkerBase<IParametersWorkerData, ParametersId, IParametersResponse> {
	threadPath: string = path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1));

	loadData(): IParametersWorkerData {
		if (this.workerData) return this.workerData;

		const data: IParametersWorkerData = {
			pokemon: {
				gens: {},
			},
		};

		const currentGen = Dex.getGen();
		for (let gen = 1; gen <= currentGen; gen++) {
			const mod = 'gen' + gen;
			const dex = Dex.getDex(mod);

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
			for (const key of dex.getData().typeKeys) {
				const type = dex.getType(key);
				if (type) typeChartKeys.push(type.name);
			}

			const allPossibleMoves: Dict<readonly string[]> = {};
			const pokedex = Games.getPokemonList({gen});
			for (const pokemon of pokedex) {
				allPossibleMoves[pokemon.id] = dex.getAllPossibleMoves(pokemon);

				if (pokemon.forme) formes[pokemon.id] = pokemon.forme;
				if (pokemon.baseSpecies !== pokemon.name) otherFormes[pokemon.id] = pokemon.baseSpecies;
				if (pokemon.isNonstandard === 'Gigantamax') gigantamax.push(pokemon.name);

				if (pokemon.evos.length && !pokemon.prevo) {
					const pokemonEvolutionLines = dex.getEvolutionLines(pokemon);
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
					const immune = dex.isImmune(type, pokemon);
					let effectiveness = 0;
					if (!immune) effectiveness = dex.getEffectiveness(type, pokemon);
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

				if (Games.isIncludedPokemonTier(pokemon.tier)) {
					const tierId = Tools.toId(pokemon.tier);
					if (!(tierId in tiers)) {
						const tierParam = {type: 'tier' as ParamType, param: pokemon.tier};
						tiers[tierId] = tierParam;
						tiers[tierId + 'tier'] = tierParam;
					}
					if (!(pokemon.tier in tierDex)) tierDex[pokemon.tier] = [];
					tierDex[pokemon.tier].push(pokemon.name);
				}

				if (dex.isPseudoLCPokemon(pokemon)) {
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

			const movesList = Games.getMovesList(undefined, gen);
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

		return data;
	}

	async search(options: IParametersSearchOptions): Promise<IParametersResponse | null> {
		return this.sendMessage('search', JSON.stringify(options));
	}

	intersect(options: IParametersIntersectOptions): IParametersResponse | null {
		this.init();

		const intersection = Tools.intersectParams(options.searchType, options.params,
			this.workerData![options.searchType].gens[options.mod]);
		return {
			params: options.params,
			pokemon: intersection,
		};
	}
}
