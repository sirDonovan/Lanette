import path = require('path');
import { PRNGSeed } from '../prng';
import { WorkerBase } from './worker-base';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface IParametersIdKeys {
	search: any;
	intersect: any;
}
export type ParametersId = keyof IParametersIdKeys;

export interface IParamTypeKeys {
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
export type ParamType = keyof IParamTypeKeys;
/* eslint-enable */

export interface IParam {
	type: string;
	param: string;
}

export interface IParametersGenData {
	readonly evolutionLines: string[];
	readonly formes: Dict<string>;
	readonly paramTypePools: KeyedDict<IParamTypeKeys, Dict<IParam>>;
	readonly paramTypeDexes: KeyedDict<IParamTypeKeys, Dict<string[]>>;
	readonly otherFormes: Dict<string>;
}

export interface IParametersWorkerData {
	readonly pokemon: {gens: Dict<IParametersGenData>};
}

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
	readonly searchType: keyof IParametersWorkerData;
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

		for (let i = 1; i <= 7; i++) {
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

			const pokedex = Games.getPokemonList(undefined, genString);
			for (const pokemon of pokedex) {
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
					for (const line of pokemonEvolutionLines) {
						evolutionLines.push(line.map(x => Tools.toId(x)).sort().join(","));
					}
				}

				const letter = pokemon.species.charAt(0);
				const letterId = Tools.toId(letter);
				if (!(letterId in letters)) {
					const letterParam = {type: 'letter', param: letter};
					letters[letterId] = letterParam;
					letters[letterId + 'letter'] = letterParam;
				}
				if (!(letter in letterDex)) letterDex[letter] = [];
				letterDex[letter].push(pokemon.species);

				const colorId = Tools.toId(pokemon.color);
				if (!(colorId in colors)) {
					const colorParam = {type: 'color', param: pokemon.color};
					colors[colorId] = colorParam;
					colors[colorId + 'color'] = colorParam;
				}
				if (!(pokemon.color in colorDex)) colorDex[pokemon.color] = [];
				colorDex[pokemon.color].push(pokemon.species);

				for (const type of pokemon.types) {
					const typeId = Tools.toId(type);
					const typeParam = {type: 'type', param: type};
					if (!(typeId in types)) {
						types[typeId] = typeParam;
						types[typeId + 'type'] = typeParam;
					}
					if (!(type in typeDex)) typeDex[type] = [];
					typeDex[type].push(pokemon.species);
				}

				for (const type of typeChartKeys) {
					const typeId = Tools.toId(type);
					const immune = dex.isImmune(type, pokemon);
					let effectiveness = 0;
					if (!immune) effectiveness = dex.getEffectiveness(type, pokemon);
					if (effectiveness >= 1) {
						if (!(typeId in weaknesses)) {
							const weaknessParam = {type: 'weakness', param: type};
							weaknesses[typeId] = weaknessParam;
							weaknesses[typeId + 'weakness'] = weaknessParam;
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
							resistances[typeId + 'resistance'] = resistanceParam;
							resistances['resists' + typeId] = resistanceParam;
							resistances['resists' + typeId + 'type'] = resistanceParam;
							resistances['resist' + typeId] = resistanceParam;
							resistances['resist' + typeId + 'type'] = resistanceParam;
						}
						if (!(type in resistancesDex)) resistancesDex[type] = [];
						resistancesDex[type].push(pokemon.species);
					}
				}

				if (Games.isIncludedPokemonTier(pokemon.tier)) {
					const tierId = Tools.toId(pokemon.tier);
					if (!(tierId in tiers)) {
						const tierParam = {type: 'tier', param: pokemon.tier};
						tiers[tierId] = tierParam;
						tiers[tierId + 'tier'] = tierParam;
					}
					if (!(pokemon.tier in tierDex)) tierDex[pokemon.tier] = [];
					tierDex[pokemon.tier].push(pokemon.species);
				}

				if (Dex.isPseudoLCPokemon(pokemon)) {
					if (!('lc' in tiers)) {
						const tierParam = {type: 'tier', param: 'LC'};
						tiers['lc'] = tierParam;
						tiers['lctier'] = tierParam;
					}
					if (!('LC' in tierDex)) tierDex['LC'] = [];
					tierDex['LC'].push(pokemon.species);
				}

				if (!(pokemon.gen in gens)) {
					const genParam = {type: 'gen', param: '' + pokemon.gen};
					gens[pokemon.gen] = genParam;
					gens['gen' + pokemon.gen] = genParam;
					gens['g' + pokemon.gen] = genParam;
				}
				if (!(pokemon.gen in genDex)) genDex[pokemon.gen] = [];
				genDex[pokemon.gen].push(pokemon.species);

				for (const i in pokemon.abilities) {
					// @ts-ignore
					const ability = pokemon.abilities[i] as string;
					const abilityId = Tools.toId(ability);
					if (!(abilityId in abilities)) {
						abilities[abilityId] = {type: 'ability', param: ability};
						abilities[abilityId + 'ability'] = {type: 'ability', param: ability};
					}
					if (!(ability in abilityDex)) abilityDex[ability] = [];
					abilityDex[ability].push(pokemon.species);
				}

				for (const eggGroup of pokemon.eggGroups) {
					const groupId = Tools.toId(eggGroup);
					const groupParam = {type: 'egggroup', param: eggGroup};
					if (!(groupId in eggGroups)) {
						eggGroups[groupId] = groupParam;
						eggGroups[groupId + 'group'] = groupParam;
					}
					if (!(eggGroup in eggGroupDex)) eggGroupDex[eggGroup] = [];
					eggGroupDex[eggGroup].push(pokemon.species);
				}
			}

			tiers['ubers'] = tiers['uber'];

			const format = dex.getExistingFormat(genString + 'ou');
			const validator = Dex.getValidator(format);
			const movesList = Games.getMovesList(undefined, genString);
			for (const move of movesList) {
				const moveParam = {type: 'move', param: move.name};
				if (move.id.startsWith('hiddenpower')) {
					const id = Tools.toId(move.name);
					moves[id] = moveParam;
					moves[id + 'move'] = moveParam;
				} else {
					moves[move.id] = moveParam;
					moves[move.id + 'move'] = moveParam;
				}

				for (const pokemon of pokedex) {
					if (pokemon.allPossibleMoves.includes(move.id) && !validator.checkLearnset(move, pokemon)) {
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

		return data;
	}

	async search(options: IParametersSearchOptions): Promise<IParametersResponse> {
		return this.sendMessage('search', JSON.stringify(options));
	}

	async intersect(options: IParametersIntersectOptions): Promise<IParametersResponse> {
		return this.sendMessage('intersect', JSON.stringify(options));
	}
}
