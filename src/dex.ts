import path = require('path');

import { alternateIconNumbers } from './data/alternate-icon-numbers';
import { badges as badgeData } from './data/badges';
import { categories as categoryData } from './data/categories';
import { characters as characterData } from './data/characters';
import { formatLinks } from './data/format-links';
import { locations as locationData } from './data/locations';
import { trainerClasses } from './data/trainer-classes';
import type { CategoryData, IDataTable, IGetPossibleTeamsOptions, IGifData, ISeparatedCustomRules, LocationTypes } from './types/dex';
import type {
	IAbility, IAbilityCopy, IFormat, IItem, IItemCopy, ILearnsetData, IMove, IMoveCopy, INature, IPokemon, IPokemonCopy,
	IPokemonShowdownDex, IPokemonShowdownValidator, IPSFormat, ITypeData
} from './types/pokemon-showdown';

const MAX_CUSTOM_NAME_LENGTH = 100;
const DEFAULT_CUSTOM_RULES_NAME = " (with custom rules)";
const CURRENT_GEN = 8;
const CURRENT_GEN_STRING = 'gen' + CURRENT_GEN;

const tagNames: Dict<string> = {
	'uber': 'Uber',
	'ou': 'OU',
	'uubl': 'UUBL',
	'uu': 'UU',
	'rubl': 'RUBL',
	'ru': 'RU',
	'nubl': 'NUBL',
	'nu': 'NU',
	'publ': 'PUBL',
	'pu': 'PU',
	'zu': 'ZU',
	'nfe': 'NFE',
	'lcuber': 'LC Uber',
	'lc': 'LC',
	'cap': 'Cap',
	'caplc': 'Cap LC',
	'capnfe': 'Cap NFE',
	'ag': 'Anything Goes',
	'duber': 'DUber',
	'dou': 'DOU',
	'dbl': 'DBL',
	'duu': 'DUU',
	'dnu': 'DNU',
	'mega': 'Mega',
	'glitch': 'Glitch',
	'past': 'Past',
	'future': 'Future',
	'lgpe': 'LGPE',
	'unobtainable': 'Unobtainable',
	'custom': 'Custom',
	'allpokemon': 'All Pokemon',
	'allitems': 'All Items',
	'allmoves': 'All Moves',
	'allabilities': 'All Abilities',
};

const clauseNicknames: Dict<string> = {
	'Same Type Clause': 'Monotype',
	'STABmons Move Legality': 'STABmons',
	'Inverse Mod': 'Inverse',
	'Allow One Sketch': 'Sketchmons',
	'Allow CAP': 'CAP',
	'Allow Tradeback': 'Tradeback',
	'Ignore Illegal Abilities': 'Almost Any Ability',
	'Hoenn Pokedex': 'Hoenn',
	'Sinnoh Pokedex': 'Sinnoh',
	'Kalos Pokedex': 'Kalos',
	'Alola Pokedex': 'Alola',
	'Galar Pokedex': 'Galar',
	'Isle of Armor Pokedex': 'Isle of Armor',
	'Little Cup': 'LC',
	'Not Fully Evolved': 'NFE',
	'Sleep Clause Mod': 'Sleep Clause',
	'Switch Priority Clause Mod': 'Switch Priority Clause',
	'Freeze Clause Mod': 'Freeze Clause',
	'350 Cup Mod': '350 Cup',
	'Flipped Mod': 'Flipped',
	'Scalemons Mod': 'Scalemons',
};

const gen2Items: string[] = ['berserkgene', 'berry', 'bitterberry', 'burntberry', 'goldberry', 'iceberry', 'mintberry', 'miracleberry',
	'mysteryberry', 'pinkbow', 'polkadotbow', 'przcureberry', 'psncureberry'];

const customRuleFormats: Dict<{banlist: string, format: string}> = {
	uubl: {banlist: '+UUBL', format: 'UU'},
	rubl: {banlist: '+RUBL', format: 'RU'},
	nubl: {banlist: '+NUBL', format: 'NU'},
	publ: {banlist: '+PUBL', format: 'PU'},
};

const customRuleAliases: Dict<string[]> = {
	uu: ['-All Pokemon', '+LC', '+LC Uber', '+NFE', '+ZU', '+PU', '+PUBL', '+NU', '+NUBL', '+RU', '+RUBL', '+UU'],
	ru: ['-All Pokemon', '+LC', '+LC Uber', '+NFE', '+ZU', '+PU', '+PUBL', '+NU', '+NUBL', '+RU'],
	nu: ['-All Pokemon', '+LC', '+LC Uber', '+NFE', '+ZU', '+PU', '+PUBL', '+NU'],
	pu: ['-All Pokemon', '+LC', '+LC Uber', '+NFE', '+ZU', '+PU'],
	cap: ['+CAP', '+CAP NFE', '+CAP LC'],
	monotype: ['Same Type Clause'],
	aaa: ['!Obtainable Abilities', '-Wonder Guard', '-Shadow Tag'],
	stabmons: ['STABmons Move Legality'],
	camomons: ['[Gen 8] Camomons'],
	inverse: ['Inverse Mod'],
	'350cup': ['350 Cup Mod'],
	flipped: ['Flipped Mod'],
	scalemons: ['Scalemons Mod'],
};

const dexes: Dict<Dex> = {};

export class Dex {
	// exported constants
	readonly currentGenString: typeof CURRENT_GEN_STRING = CURRENT_GEN_STRING;
	readonly customRuleAliases: typeof customRuleAliases = customRuleAliases;
	readonly customRuleFormats: typeof customRuleFormats = customRuleFormats;
	readonly defaultCustomRulesName: typeof DEFAULT_CUSTOM_RULES_NAME = DEFAULT_CUSTOM_RULES_NAME;
	dexes: Dict<Dex> = dexes;
	formatNamesByCustomRules: Dict<string> = {};
	readonly omotms: string[] = [];
	readonly tagNames: typeof tagNames = tagNames;

	readonly clientDataDirectory: string;
	readonly currentMod: string;
	readonly gen: number;
	readonly isBase: boolean;
	readonly pokemonShowdownDex: IPokemonShowdownDex;
	readonly pokemonShowdownValidator: IPokemonShowdownValidator;

	/* eslint-disable @typescript-eslint/no-unsafe-assignment */
	private abilitiesList: readonly IAbility[] | null = null;
	private readonly abilityCache: Dict<IAbility> = Object.create(null);
	private readonly allPossibleMovesCache: Dict<string[]> = Object.create(null);
	private readonly dataCache: IDataTable | null = null;
	private readonly effectivenessCache: Dict<Dict<number>> = Object.create(null);
	private readonly evolutionLinesCache: Dict<string[][]> = Object.create(null);
	private readonly evolutionLinesFormesCache: Dict<Dict<string[][]>> = Object.create(null);
	private readonly immunityCache: Dict<Dict<boolean>> = Object.create(null);
	private readonly itemCache: Dict<IItem> = Object.create(null);
	private itemsList: readonly IItem[] | null = null;
	private readonly isEvolutionFamilyCache: Dict<boolean> = Object.create(null);
	private readonly learnsetDataCache: Dict<ILearnsetData> = Object.create(null);
	private readonly moveCache: Dict<IMove> = Object.create(null);
	private movesList: readonly IMove[] | null = null;
	private readonly moveAvailbilityCache: Dict<number> = Object.create(null);
	private readonly natureCache: Dict<INature> = Object.create(null);
	private readonly pokemonCache: Dict<IPokemon> = Object.create(null);
	private pokemonList: readonly IPokemon[] | null = null;
	private readonly formesCache: Dict<string[]> = Object.create(null);
	private readonly pseudoLCPokemonCache: Dict<boolean> = Object.create(null);
	private readonly typeCache: Dict<ITypeData> = Object.create(null);
	private readonly weaknessesCache: Dict<string[]> = Object.create(null);
	/* eslint-enable */

	constructor(gen?: number, mod?: string) {
		if (!gen) gen = CURRENT_GEN;
		if (!mod) mod = 'base';

		const simDist = ".sim-dist";
		// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
		const pokemonShowdownDexBase = require(path.join(Tools.pokemonShowdownFolder, simDist, "dex.js")).Dex as IPokemonShowdownDex;

		const isBase = mod === 'base';
		if (isBase) {
			dexes['base'] = this;
			dexes[CURRENT_GEN_STRING] = this;
			this.pokemonShowdownDex = pokemonShowdownDexBase;

			// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
			this.pokemonShowdownValidator = require(path.join(Tools.pokemonShowdownFolder, simDist, "team-validator.js"))
				.TeamValidator as IPokemonShowdownValidator;
		} else {
			this.pokemonShowdownDex = pokemonShowdownDexBase.mod(mod);
			this.pokemonShowdownValidator = dexes['base'].pokemonShowdownValidator;
		}

		this.clientDataDirectory = path.join(Tools.rootFolder, 'client-data');
		this.currentMod = mod;
		this.gen = gen;
		this.isBase = isBase;
	}

	onReload(previous: Partial<Dex>): void {
		if (previous.pokemonShowdownDex) {
			const pokemonShowdownDexes = previous.pokemonShowdownDex.dexes;
			for (const mod in pokemonShowdownDexes) {
				const dex = pokemonShowdownDexes[mod];
				for (const i in dex) {
					// @ts-expect-error
					delete dex[i];
				}

				delete pokemonShowdownDexes[mod];
			}
		}

		for (const mod in previous.dexes) {
			if (previous.dexes[mod] !== previous) {
				const dex = previous.dexes[mod];
				for (const i in dex) {
					// @ts-expect-error
					delete dex[i];
				}
			}
			delete previous.dexes[mod];
		}

		for (const i in previous) {
			// @ts-expect-error
			delete previous[i];
		}

		this.loadAllData();
	}

	getDex(mod?: string): Dex {
		if (!mod) mod = CURRENT_GEN_STRING;
		return dexes[mod];
	}

	get data(): IDataTable {
		if (!this.dataCache) this.loadData();
		return this.dataCache!;
	}

	loadAllData(): void {
		for (const mod in dexes) {
			dexes[mod].loadData();
		}
	}

	loadData(): void {
		if (this.dataCache) return;

		if (this.isBase) {
			this.pokemonShowdownDex.includeModData();

			const baseCustomRuleFormats = Object.keys(customRuleFormats);
			for (let i = CURRENT_GEN; i > 0; i--) {
				const gen = 'gen' + i;
				for (const name of baseCustomRuleFormats) {
					const format = gen + customRuleFormats[name].format;
					if (!this.pokemonShowdownDex.getFormat(format).exists) continue;

					customRuleFormats[gen + name] = {
						banlist: customRuleFormats[name].banlist,
						format,
					};
				}
			}
		}

		/* eslint-disable @typescript-eslint/no-var-requires */
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const gifData = require(path.join(this.clientDataDirectory, 'pokedex-mini.js')).BattlePokemonSprites as Dict<IGifData | undefined>;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const gifDataBW = require(path.join(this.clientDataDirectory, 'pokedex-mini-bw.js'))
			.BattlePokemonSpritesBW as Dict<IGifData | undefined>;

		const trainerSpriteList = require(path.join(this.clientDataDirectory, 'trainer-sprites.js')) as string[];
		const trainerSprites: Dict<string> = {};
		for (const trainer of trainerSpriteList) {
			trainerSprites[Tools.toId(trainer)] = trainer;
		}
		/* eslint-enable */

		const parsedCategories: CategoryData = categoryData;
		const speciesList = Object.keys(parsedCategories);
		for (const species of speciesList) {
			const id = Tools.toId(species);
			if (id === species) continue;
			parsedCategories[id] = parsedCategories[species];
			delete parsedCategories[species];
		}

		const abilityKeys = Object.keys(this.pokemonShowdownDex.data.Abilities);
		const filteredAbilityKeys: string[] = [];
		for (const key of abilityKeys) {
			const ability = this.getAbility(key)!;
			if (ability.gen > this.gen) continue;

			filteredAbilityKeys.push(key);
		}

		const itemKeys = Object.keys(this.pokemonShowdownDex.data.Items);
		const filteredItemKeys: string[] = [];
		for (const key of itemKeys) {
			const item = this.getItem(key)!;
			if (item.gen > this.gen) continue;

			filteredItemKeys.push(key);
		}

		const learnsetDataKeys = Object.keys(this.pokemonShowdownDex.data.Learnsets);
		const filteredLearnsetDataKeys: string[] = [];
		for (const key of learnsetDataKeys) {
			const pokemon = this.getPokemon(key)!;
			if (pokemon.gen > this.gen) continue;
			filteredLearnsetDataKeys.push(key);
		}

		const colors: Dict<string> = {};
		const eggGroups: Dict<string> = {};

		const validator = new this.pokemonShowdownValidator("gen" + this.gen + "ou", dexes['base'].pokemonShowdownDex);
		const lcFormat = this.pokemonShowdownDex.getFormat("gen" + this.gen + "lc");
		const pokemonKeys = Object.keys(this.pokemonShowdownDex.data.Pokedex);
		const filteredPokemonKeys: string[] = [];
		const moveAvailbilityPokemonList: IPokemon[] = [];
		for (const key of pokemonKeys) {
			const pokemon = this.getPokemon(key)!;
			if (pokemon.gen > this.gen) continue;

			this.cacheAllPossibleMoves(validator, pokemon);
			this.cacheIsPseudoLCPokemon(pokemon, lcFormat);
			filteredPokemonKeys.push(key);

			if (pokemon.isNonstandard !== 'CAP' && pokemon.isNonstandard !== 'LGPE' && pokemon.isNonstandard !== 'Custom') {
				moveAvailbilityPokemonList.push(pokemon);

				if (pokemon.color) {
					const id = Tools.toId(pokemon.color);
					if (!(id in colors)) {
						colors[id] = pokemon.color;
					}
				}

				for (const eggGroup of pokemon.eggGroups) {
					const id = Tools.toId(eggGroup);
					if (!(id in eggGroups)) {
						eggGroups[id] = eggGroup;
					}
				}
			}
		}

		const moveKeys = Object.keys(this.pokemonShowdownDex.data.Moves);
		const filteredMoveKeys: string[] = [];
		for (const key of moveKeys) {
			const move = this.getMove(key)!;
			if (move.gen > this.gen) continue;

			this.cacheMoveAvailability(move, moveAvailbilityPokemonList);
			filteredMoveKeys.push(key);
		}

		const natureKeys = Object.keys(this.pokemonShowdownDex.data.Natures);
		const filteredNatureKeys: string[] = [];
		for (const key of natureKeys) {
			const nature = this.getNature(key)!;
			if (nature.gen > this.gen) continue;
			filteredNatureKeys.push(key);
		}

		const data: IDataTable = {
			abilityKeys: filteredAbilityKeys,
			formatKeys: Object.keys(this.pokemonShowdownDex.data.Formats),
			itemKeys: filteredItemKeys,
			learnsetDataKeys: filteredLearnsetDataKeys,
			moveKeys: filteredMoveKeys,
			natureKeys: filteredNatureKeys,
			pokemonKeys: filteredPokemonKeys,
			typeKeys: Object.keys(this.pokemonShowdownDex.data.TypeChart).map(x => Tools.toId(x)),
			alternateIconNumbers,
			badges: badgeData,
			categories: parsedCategories,
			characters: characterData,
			colors,
			eggGroups,
			gifData,
			gifDataBW,
			locations: locationData,
			trainerClasses,
			trainerSprites,
		};

		// @ts-expect-error
		this.dataCache = data;
	}

	async fetchClientData(): Promise<void> {
		const files = ['pokedex-mini.js', 'pokedex-mini-bw.js'];
		for (const fileName of files) {
			const file = await Tools.fetchUrl('https://' + Tools.mainServer + '/data/' + fileName);
			if (typeof file !== 'string') {
				console.log(file);
			} else if (file) {
				await Tools.safeWriteFile(path.join(this.clientDataDirectory, fileName), file);
			}
		}
	}

	/*
		Abilities
	*/

	getAbility(name: string): IAbility | undefined {
		const id = Tools.toId(name);
		if (Object.prototype.hasOwnProperty.call(this.abilityCache, id)) return this.abilityCache[id];

		const ability = this.pokemonShowdownDex.getAbility(name);
		if (!ability.exists) return undefined;

		this.abilityCache[id] = ability;
		return ability;
	}

	getExistingAbility(name: string): IAbility {
		const ability = this.getAbility(name);
		if (!ability) throw new Error("No ability returned for '" + name + "'");
		return ability;
	}

	getAbilityCopy(name: string | IAbility): IAbilityCopy {
		return Tools.deepClone(typeof name === 'string' ? this.getExistingAbility(name) : name);
	}

	/** Returns a list of existing abilities */
	getAbilitiesList(): readonly IAbility[] {
		if (this.abilitiesList) return this.abilitiesList;

		const abilities: IAbility[] = [];
		for (const i of this.data.abilityKeys) {
			const ability = this.getExistingAbility(i);
			if (ability.isNonstandard === 'CAP' || ability.isNonstandard === 'LGPE' || ability.isNonstandard === 'Custom' ||
				ability.id === 'noability' || ability.gen > this.gen) continue;
			abilities.push(ability);
		}

		this.abilitiesList = abilities;
		return abilities;
	}

	isAbility(object: {effectType: string, name: string}): object is IAbility {
		const ability = this.getAbility(object.name);
		if (!ability || ability.effectType !== object.effectType) return false;
		return true;
	}

	/*
		Items
	*/

	getItem(name: string): IItem | undefined {
		const id = Tools.toId(name);
		if (Object.prototype.hasOwnProperty.call(this.itemCache, id)) return this.itemCache[id];

		const item = this.pokemonShowdownDex.getItem(name);
		if (!item.exists) return undefined;

		this.itemCache[id] = item;
		return item;
	}

	getExistingItem(name: string): IItem {
		const item = this.getItem(name);
		if (!item) throw new Error("No item returned for '" + name + "'");
		return item;
	}

	getItemCopy(name: string | IItem): IItemCopy {
		return Tools.deepClone(typeof name === 'string' ? this.getExistingItem(name) : name);
	}

	/** Returns a list of existing items */
	getItemsList(): readonly IItem[] {
		if (this.itemsList) return this.itemsList;

		const items: IItem[] = [];
		for (const i of this.data.itemKeys) {
			const item = this.getExistingItem(i);
			if (item.isNonstandard === 'CAP' || item.isNonstandard === 'LGPE' || item.isNonstandard === 'Custom' || item.gen > this.gen ||
				(this.gen !== 2 && gen2Items.includes(item.id))) continue;
			items.push(item);
		}

		this.itemsList = items;
		return items;
	}

	isItem(object: {effectType: string, name: string}): object is IItem {
		const item = this.getItem(object.name);
		if (!item || item.effectType !== object.effectType) return false;
		return true;
	}

	getLearnsetData(name: string): ILearnsetData | undefined {
		const id = Tools.toId(name);
		if (Object.prototype.hasOwnProperty.call(this.learnsetDataCache, id)) return this.learnsetDataCache[id];

		const learnsetData = this.pokemonShowdownDex.getLearnsetData(id);
		if (!learnsetData.exists) return undefined;

		this.learnsetDataCache[id] = learnsetData;
		return learnsetData;
	}

	/*
		Moves
	*/

	getMove(name: string): IMove | undefined {
		const id = Tools.toId(name);
		if (Object.prototype.hasOwnProperty.call(this.moveCache, id)) return this.moveCache[id];

		const move = this.pokemonShowdownDex.getMove(name);
		if (!move.exists) return undefined;

		this.moveCache[id] = move;
		return move;
	}

	getExistingMove(name: string): IMove {
		const move = this.getMove(name);
		if (!move) throw new Error("No move returned for '" + name + "'");
		return move;
	}

	getMoveCopy(name: string | IMove): IMoveCopy {
		return Tools.deepClone(typeof name === 'string' ? this.getExistingMove(name) : name) as IMoveCopy;
	}

	/** Returns a list of existing moves */
	getMovesList(): readonly IMove[] {
		if (this.movesList) return this.movesList;

		const moves: IMove[] = [];
		for (const i of this.data.moveKeys) {
			const move = this.getExistingMove(i);
			if (move.isNonstandard === 'CAP' || move.isNonstandard === 'LGPE' || move.isNonstandard === 'Custom' ||
				move.gen > this.gen) continue;
			moves.push(move);
		}

		this.movesList = moves;
		return moves;
	}

	isMove(object: {effectType: string, name: string}): object is IMove {
		const move = this.getMove(object.name);
		if (!move || move.effectType !== object.effectType) return false;
		return true;
	}

	getMoveAvailability(move: IMove): number {
		if (move.gen > this.gen) throw new Error("Dex.getMoveAvailability called for " + move.name + " in gen " + this.gen);
		return this.moveAvailbilityCache[move.id];
	}

	/*
		Pokemon
	*/

	getPokemon(name: string): IPokemon | undefined {
		const id = Tools.toId(name);
		if (Object.prototype.hasOwnProperty.call(this.pokemonCache, id)) return this.pokemonCache[id];

		const pokemon = Tools.deepClone(this.pokemonShowdownDex.getSpecies(name));
		if (!pokemon.exists) return undefined;

		if (pokemon.tier === '(Uber)') {
			pokemon.tier = 'Uber';
		} else if (pokemon.tier === '(NU)') {
			pokemon.tier = 'PU';
		} else if (pokemon.tier === '(PU)') {
			pokemon.tier = 'ZU';
		}

		this.pokemonCache[id] = pokemon;
		return pokemon;
	}

	getExistingPokemon(name: string): IPokemon {
		const pokemon = this.getPokemon(name);
		if (!pokemon) throw new Error("No Pokemon returned for '" + name + "'");
		return pokemon;
	}

	getPokemonCopy(name: string | IPokemon): IPokemonCopy {
		return Tools.deepClone(typeof name === 'string' ? this.getExistingPokemon(name) : name) as IPokemonCopy;
	}

	/** Returns a list of existing Pokemon */
	getPokemonList(): readonly IPokemon[] {
		if (this.pokemonList) return this.pokemonList;

		const pokedex: IPokemon[] = [];
		for (const i of this.data.pokemonKeys) {
			const pokemon = this.getExistingPokemon(i);
			if (pokemon.isNonstandard === 'CAP' || pokemon.isNonstandard === 'LGPE' || pokemon.isNonstandard === 'Custom' ||
				pokemon.isNonstandard === 'Unobtainable' || pokemon.gen > this.gen) continue;
			pokedex.push(pokemon);
		}

		this.pokemonList = pokedex;
		return pokedex;
	}

	isPokemon(object: {effectType: string, name: string}): object is IPokemon {
		const pokemon = this.getPokemon(object.name);
		if (!pokemon || pokemon.effectType !== object.effectType) return false;
		return true;
	}

	getPokemonCategory(pokemon: IPokemon): string {
		return this.data.categories[pokemon.id] || '';
	}

	getFormes(pokemon: IPokemon): string[] {
		if (Object.prototype.hasOwnProperty.call(this.formesCache, pokemon.name)) return this.formesCache[pokemon.name];

		const baseSpecies = this.getExistingPokemon(pokemon.baseSpecies);
		const formes: string[] = [baseSpecies.name];

		if (baseSpecies.otherFormes) {
			for (const otherForme of baseSpecies.otherFormes) {
				const forme = this.getExistingPokemon(otherForme);
				if (!forme.battleOnly) formes.push(forme.name);
			}
		}

		if (baseSpecies.cosmeticFormes) {
			for (const cosmeticForme of baseSpecies.cosmeticFormes) {
				const forme = this.getExistingPokemon(cosmeticForme);
				if (!forme.battleOnly) formes.push(forme.name);
			}
		}

		this.formesCache[pokemon.name] = formes;
		return formes;
	}

	getAllPossibleMoves(pokemon: IPokemon): readonly string[] {
		if (pokemon.gen > this.gen) throw new Error("Dex.getAllPossibleMoves() called on " + pokemon.name + " in gen " + this.gen);
		return this.allPossibleMovesCache[pokemon.id];
	}

	getEvolutionLines(pokemon: IPokemon, includedFormes?: readonly string[]): readonly string[][] {
		let sortedFormes: string[] | undefined;
		let cacheKey: string | undefined;
		if (includedFormes) {
			sortedFormes = includedFormes.slice().sort();
			cacheKey = sortedFormes.join(',');
			if (Object.prototype.hasOwnProperty.call(this.evolutionLinesFormesCache, pokemon.id) &&
				Object.prototype.hasOwnProperty.call(this.evolutionLinesFormesCache[pokemon.id], cacheKey)) {
				return this.evolutionLinesFormesCache[pokemon.id][cacheKey];
			}
		} else {
			if (Object.prototype.hasOwnProperty.call(this.evolutionLinesCache, pokemon.id)) return this.evolutionLinesCache[pokemon.id];
		}

		const potentialEvolutionLines: string[][] = this.getAllEvolutionLines(pokemon);
		const formesToCheck: string[] = [pokemon.name];
		if (sortedFormes) {
			for (const name of sortedFormes) {
				const forme = this.getExistingPokemon(name);
				const formeEvolutionLines = this.getAllEvolutionLines(forme);
				for (const line of formeEvolutionLines) {
					if (!Tools.arraysContainArray(line, potentialEvolutionLines)) {
						potentialEvolutionLines.push(line);
					}
				}

				formesToCheck.push(forme.name);
			}
		}

		const matchingEvolutionLines: string[][] = [];
		for (const line of potentialEvolutionLines) {
			for (const forme of formesToCheck) {
				if (line.includes(forme)) {
					matchingEvolutionLines.push(line);
					break;
				}
			}
		}

		if (sortedFormes) {
			if (!Object.prototype.hasOwnProperty.call(this.evolutionLinesFormesCache, pokemon.id)) {
				this.evolutionLinesFormesCache[pokemon.id] = {};
			}
			this.evolutionLinesFormesCache[pokemon.id][cacheKey!] = matchingEvolutionLines;
		} else {
			this.evolutionLinesCache[pokemon.id] = matchingEvolutionLines;
		}

		return matchingEvolutionLines;
	}

	isEvolutionFamily(speciesList: readonly string[]): boolean {
		if (speciesList.length < 2) return true;

		const cacheKey = speciesList.slice().sort().join(',');
		if (Object.prototype.hasOwnProperty.call(this.isEvolutionFamilyCache, cacheKey)) return this.isEvolutionFamilyCache[cacheKey];

		const evolutionLines: (readonly string[][])[] = [];

		for (const species of speciesList) {
			evolutionLines.push(this.getEvolutionLines(this.getExistingPokemon(species)));
		}

		evolutionLines.sort((a, b) => a.length - b.length);

		for (let i = 0; i < evolutionLines.length - 1; i++) {
			let sharedEvolutionLine = false;
			const currentLine = evolutionLines[i];
			const nextLine = evolutionLines[i + 1];

			outer:
			for (const current of currentLine) {
				for (const next of nextLine) {
					if (Tools.compareArrays(current, next)) {
						sharedEvolutionLine = true;
						break outer;
					}
				}
			}

			if (!sharedEvolutionLine) {
				this.isEvolutionFamilyCache[cacheKey] = false;
				return false;
			}
		}

		this.isEvolutionFamilyCache[cacheKey] = true;
		return true;
	}

	getType(name: string): ITypeData | undefined {
		const id = Tools.toId(name);
		if (Object.prototype.hasOwnProperty.call(this.typeCache, id)) return this.typeCache[id];

		const type = this.pokemonShowdownDex.getType(name);
		if (!type.exists) return undefined;

		if (!type.id) type.id = Tools.toId(type.name);
		this.typeCache[id] = type;
		return type;
	}

	getExistingType(name: string): ITypeData {
		const type = this.getType(name);
		if (!type) throw new Error("No type returned for '" + name + "'");
		return type;
	}

	getNature(name: string): INature | undefined {
		const id = Tools.toId(name);
		if (Object.prototype.hasOwnProperty.call(this.natureCache, id)) return this.natureCache[id];

		const nature = this.pokemonShowdownDex.getNature(name);
		if (!nature.exists) return undefined;

		this.natureCache[id] = nature;
		return nature;
	}

	getExistingNature(name: string): INature {
		const nature = this.getNature(name);
		if (!nature) throw new Error("No nature returned for '" + name + "'");
		return nature;
	}

	getBadges(): string[] {
		const badges: string[] = [];
		for (const i in this.data.badges) {
			for (const badge of this.data.badges[i]) {
				badges.push(badge);
			}
		}

		return badges;
	}

	getCharacters(): string[] {
		const characters: string[] = [];
		for (const i in this.data.characters) {
			for (const character of this.data.characters[i]) {
				characters.push(character);
			}
		}

		return characters;
	}

	getLocations(): string[] {
		const locations: string[] = [];
		for (const region in this.data.locations) {
			const types = Object.keys(this.data.locations[region]) as LocationTypes[];
			for (const type of types) {
				for (const location of this.data.locations[region][type]) {
					locations.push(location);
				}
			}
		}

		return locations;
	}

	/**
	 * Returns true if target is immune to source
	 */
	isImmune(source: IMove | string, target: string | readonly string[] | IPokemon): boolean {
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
			const cacheKey = targetType.join(',');
			if (!Object.prototype.hasOwnProperty.call(this.immunityCache, sourceType)) {
				this.immunityCache[sourceType] = {};
			} else if (Object.prototype.hasOwnProperty.call(this.immunityCache[sourceType], cacheKey)) {
				return this.immunityCache[sourceType][cacheKey];
			}

			for (const type of targetType) {
				if (this.isImmune(sourceType, type)) {
					this.immunityCache[sourceType][cacheKey] = true;
					return true;
				}
			}

			this.immunityCache[sourceType][cacheKey] = false;
			return false;
		} else {
			targetType = targetType as string;
			if (!Object.prototype.hasOwnProperty.call(this.immunityCache, sourceType)) {
				this.immunityCache[sourceType] = {};
			} else if (Object.prototype.hasOwnProperty.call(this.immunityCache[sourceType], targetType)) {
				return this.immunityCache[sourceType][targetType];
			}

			const typeData = this.getType(targetType);
			if (typeData && typeData.damageTaken[sourceType] === 3) {
				this.immunityCache[sourceType][targetType] = true;
				return true;
			}

			this.immunityCache[sourceType][targetType] = false;
			return false;
		}
	}

	/** LC handling, checks for LC Pokemon in higher tiers that need to be handled separately, as well as event-only Pokemon that are not eligible for LC despite being the first stage */
	isPseudoLCPokemon(pokemon: IPokemon): boolean {
		if (pokemon.gen > this.gen) throw new Error("Dex.isPseudoLCPokemon() called for " + pokemon.name + " in gen " + this.gen);
		return this.pseudoLCPokemonCache[pokemon.id];
	}

	/**
	 * Returns >=1 if super-effective, <=1 if not very effective
	 */
	getEffectiveness(source: IMove | string, target: IPokemon | string | readonly string[]): number {
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
			const cacheKey = targetType.join(',');
			if (!Object.prototype.hasOwnProperty.call(this.effectivenessCache, sourceType)) {
				this.effectivenessCache[sourceType] = {};
			} else if (Object.prototype.hasOwnProperty.call(this.effectivenessCache[sourceType], cacheKey)) {
				return this.effectivenessCache[sourceType][cacheKey];
			}

			let totalTypeMod = 0;
			for (const type of targetType) {
				totalTypeMod += this.getEffectiveness(sourceType, type);
			}

			this.effectivenessCache[sourceType][cacheKey] = totalTypeMod;
			return totalTypeMod;
		} else {
			targetType = targetType as string;
			if (!Object.prototype.hasOwnProperty.call(this.effectivenessCache, sourceType)) {
				this.effectivenessCache[sourceType] = {};
			} else if (Object.prototype.hasOwnProperty.call(this.effectivenessCache[sourceType], targetType)) {
				return this.effectivenessCache[sourceType][targetType];
			}

			const typeData = this.getType(targetType);
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

				// in case of weird situations like Gravity, immunity is
				// handled elsewhere
				default: {
					effectiveness = 0;
				}
				}
			} else {
				effectiveness = 0;
			}

			this.effectivenessCache[sourceType][targetType] = effectiveness;
			return effectiveness;
		}
	}

	getWeaknesses(pokemon: IPokemon): readonly string[] {
		const cacheKey = pokemon.types.slice().sort().join(',');
		if (Object.prototype.hasOwnProperty.call(this.weaknessesCache, cacheKey)) return this.weaknessesCache[cacheKey];

		const weaknesses: string[] = [];
		for (const key of this.data.typeKeys) {
			const type = this.getExistingType(key);
			const isImmune = this.isImmune(type.name, pokemon);
			const effectiveness = this.getEffectiveness(type.name, pokemon);
			if (!isImmune && effectiveness >= 1) weaknesses.push(type.name);
		}

		this.weaknessesCache[cacheKey] = weaknesses;
		return weaknesses;
	}

	hasGifData(pokemon: IPokemon, generation?: 'xy' | 'bw', direction?: 'front' | 'back'): boolean {
		if (!generation) generation = 'xy';
		if (!direction) direction = 'front';
		if (generation === 'bw') {
			if (Object.prototype.hasOwnProperty.call(this.data.gifDataBW, pokemon.id) && this.data.gifDataBW[pokemon.id]![direction]) {
				return true;
			}
		} else {
			if (Object.prototype.hasOwnProperty.call(this.data.gifData, pokemon.id) && this.data.gifData[pokemon.id]![direction]) {
				return true;
			}
		}
		return false;
	}

	getPokemonGif(pokemon: IPokemon, generation?: 'xy' | 'bw', direction?: 'front' | 'back', shiny?: boolean): string {
		if (!generation) generation = 'xy';
		const bw = generation === 'bw';
		if (bw && pokemon.gen > 5) return '';

		let prefix = '//' + Tools.mainServer + '/sprites/' + generation + 'ani';
		if (!direction) direction = 'front';
		if (direction === 'front') {
			if (shiny) {
				prefix += "-shiny";
			}
		} else {
			if (shiny) {
				prefix += "-back-shiny";
			} else {
				prefix += "-back";
			}
		}

		let gifData: IGifData | undefined;
		if (bw) {
			if (Object.prototype.hasOwnProperty.call(this.data.gifDataBW, pokemon.id)) gifData = this.data.gifDataBW[pokemon.id]!;
		} else {
			if (Object.prototype.hasOwnProperty.call(this.data.gifData, pokemon.id)) gifData = this.data.gifData[pokemon.id]!;
		}

		let width: number;
		let height: number;
		if (gifData && gifData[direction]) {
			width = gifData[direction]!.w;
			height = gifData[direction]!.h;
		} else {
			width = 96;
			height = 96;
		}

		return '<img src="' + prefix + '/' + pokemon.spriteid + '.gif" width="' + width + '" height="' + height + '" />';
	}

	getPokemonIcon(pokemon: IPokemon, facingLeft?: boolean): string {
		let num = pokemon.num;
		if (num < 0) {
			num = 0;
		} else if (num > 893) {
			num = 0;
		}

		if (facingLeft) {
			if (this.data.alternateIconNumbers.left[pokemon.id]) num = this.data.alternateIconNumbers.left[pokemon.id]!;
		} else if (pokemon.gender === 'F') {
			if (pokemon.id === 'unfezant' || pokemon.id === 'frillish' || pokemon.id === 'jellicent' || pokemon.id === 'meowstic' ||
				pokemon.id === 'pyroar') {
				num = this.data.alternateIconNumbers.right[pokemon.id + 'f']!;
			}
		} else {
			if (this.data.alternateIconNumbers.right[pokemon.id]) num = this.data.alternateIconNumbers.right[pokemon.id]!;
		}

		const height = 30;
		const width = 40;
		const top = Math.floor(num / 12) * height;
		const left = (num % 12) * width;
		const facingLeftStyle = facingLeft ? "transform:scaleX(-1);webkit-transform:scaleX(-1);" : "";
		return '<span style="display: inline-block;height: ' + height + 'px;width: ' + width + 'px;image-rendering: pixelated;' +
			'background:transparent url(https://' + Tools.mainServer + '/sprites/pokemonicons-sheet.png?v2) no-repeat scroll -' + left +
			'px -' + top + 'px;' + facingLeftStyle + '"></span>';
	}

	getPSPokemonIcon(pokemon: IPokemon): string {
		return '<psicon pokemon="' + pokemon.id + '" style="vertical-align: -7px;margin: -2px" />';
	}

	getItemIcon(item: IItem): string {
		let num = 0;
		if (item.spritenum) num = item.spritenum;

		const height = 24;
		const width = 24;
		const top = Math.floor(num / 16) * height;
		const left = (num % 16) * width;
		return '<span style="display: inline-block;height: ' + height + 'px;width: ' + width + 'px;image-rendering: pixelated;' +
			'background:transparent url(https://' + Tools.mainServer + '/sprites/itemicons-sheet.png?g8) no-repeat scroll -' + left +
			'px -' + top + 'px;"></span>';
	}

	getPSItemIcon(item: IItem): string {
		return '<psicon item="' + item.id + '" style="vertical-align: -7px;margin: -2px" />';
	}

	getTrainerSpriteId(name: string): string | undefined {
		const id = Tools.toId(name);
		if (Object.prototype.hasOwnProperty.call(this.data.trainerSprites, id)) return this.data.trainerSprites[id];

		for (let i = this.gen; i > 0; i--) {
			const oldGenId = id + 'gen' + i;
			if (Object.prototype.hasOwnProperty.call(this.data.trainerSprites, oldGenId)) return this.data.trainerSprites[oldGenId];
		}
	}

	getTrainerSprite(id: string): string {
		return '<img src="//' + Tools.mainServer + '/sprites/trainers/' + id + '.png" width=80px height=80px />';
	}

	getTypeHtml(type: ITypeData, width?: number): string {
		if (!width) width = 75;

		const colorData = Tools.hexColorCodes[Tools.typeHexColors[type.name]];
		return '<div style="display:inline-block;background-color:' + colorData['background-color'] + ';background:' +
			colorData['background'] + ';border-color:' + colorData['border-color'] + ';border: 1px solid #a99890;border-radius:3px;' +
			'width:' + width + 'px;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;' +
			'font-size:8pt;text-align:center"><b>' + type.name + '</b></div>';
	}

	/*
		Formats
	*/

	splitNameAndCustomRules(input: string): [string, string[]] {
		let customRules: string[] = [];
		const [name, customRulesString] = input.split('@@@', 2);
		if (customRulesString) customRules = customRulesString.split(',');

		return [name, customRules];
	}

	getFormat(name: string, isValidated?: boolean): IFormat | undefined {
		let formatId = Tools.toId(name);
		if (!formatId) return;

		name = name.trim();
		const inputTarget = name;
		let format = this.pokemonShowdownDex.getFormat(name, isValidated);
		if (!format.exists) {
			let allCustomRules: string[] = [];
			const split = this.splitNameAndCustomRules(name);
			allCustomRules = allCustomRules.concat(split[1]);
			const parts = split[0].split(" ");
			if (parts.length > 1) {
				let formatNameIndex = parts.length - 1;
				for (let i = 0; i < parts.length - 1; i++) {
					const id = Tools.toId(parts[i]);
					if (id in customRuleAliases) {
						for (const rule of customRuleAliases[id]) {
							allCustomRules.push(rule);
						}
					} else {
						formatNameIndex = i;
						break;
					}
				}

				name = parts.slice(formatNameIndex).join(" ");
			} else {
				name = split[0];
			}

			formatId = name;
			if (formatId in customRuleFormats) {
				const customRuleSplit = this.splitNameAndCustomRules(customRuleFormats[formatId].format + '@@@' +
					customRuleFormats[formatId].banlist);
				name = customRuleSplit[0];
				allCustomRules = allCustomRules.concat(customRuleSplit[1]);
			}

			const uniqueCustomRules: string[] = [];
			for (const rule of allCustomRules) {
				const trimmed = rule.trim();
				if (!uniqueCustomRules.includes(trimmed)) uniqueCustomRules.push(trimmed);
			}

			if (uniqueCustomRules.length) name += "@@@" + uniqueCustomRules.join(',');

			format = this.pokemonShowdownDex.getFormat(name, isValidated);

			if (!format.exists) {
				for (let i = CURRENT_GEN - 1; i >= 1; i--) {
					format = this.pokemonShowdownDex.getFormat('gen' + i + name, isValidated);
					if (format.exists) break;
				}
			}
		}

		if (!format.exists) return undefined;

		format.inputTarget = inputTarget;
		format.quickFormat = format.teamLength && format.teamLength.battle && format.teamLength.battle <= 2 ? true : false;
		format.tournamentPlayable = !!(format.searchShow || format.challengeShow || format.tournamentShow);
		format.unranked = format.rated === false || format.id.includes('customgame') || format.id.includes('hackmonscup') ||
			format.id.includes('challengecup') || format.id.includes('metronomebattle') ||
			(format.team && (format.id.includes('1v1') || format.id.includes('monotype'))) || format.mod === 'seasonal' ||
			format.mod === 'ssb' ? true : false;

		let info: string | undefined;
		let teams: string | undefined;
		let viability: string | undefined;

		const idWithoutGen = format.name.includes("[Gen ") ? Tools.toId(format.name.substr(format.name.indexOf(']') + 1)) : format.id;
		if (format.threads) {
			const threads = format.threads.slice();
			for (const thread of threads) {
				const parsedThread = Tools.parseFormatThread(thread);
				if (parsedThread.description.includes('Viability Rankings')) {
					viability = parsedThread.id;
				} else if (parsedThread.description.includes('Sample Teams')) {
					teams = parsedThread.id;
				} else if (Tools.toId(parsedThread.description) === idWithoutGen) {
					info = parsedThread.id;
				}
			}

			if (format.id in formatLinks) {
				const links = formatLinks[format.id]!;
				if (links.info) {
					format['info-official'] = info;
					format.info = links.info;
				} else {
					format.info = info;
				}

				if (links.teams) {
					format['teams-official'] = teams;
					format.teams = links.teams;
				} else {
					format.teams = teams;
				}

				if (links.viability) {
					format['viability-official'] = viability;
					format.viability = links.viability;
				} else {
					format.viability = viability;
				}
			} else {
				format.info = info;
				format.teams = teams;
				format.viability = viability;
			}

			const links = ['info', 'roleCompendium', 'teams', 'viability', 'genGuide'] as const;
			for (const id of links) {
				if (format[id]) {
					// @ts-expect-error
					const officialLink = format[id + '-official'] as string;
					format[id] = Tools.getNewerForumThread(format[id] as string, officialLink);
				}
			}
		}

		return format;
	}

	getExistingFormat(name: string, isTrusted?: boolean): IFormat {
		const format = this.getFormat(name, isTrusted);
		if (!format) throw new Error("No format returned for '" + name + "'");
		return format;
	}

	getFormatInfoDisplay(format: IFormat): string {
		let html = '';
		if (format.desc) {
			html += '<br />&nbsp; - ' + format.desc;
			if (format.info) {
				html += ' More info ';
				if (format.info.startsWith(Tools.smogonDexPrefix)) {
					html += 'on the <a href="' + format.info + '">dex page</a>';
				} else {
					html += 'in the <a href="' + format.info + '">discussion thread</a>';
				}
			}
		} else if (format.info) {
			html += '<br />&nbsp; - Description and more info ' + (format.info.startsWith(Tools.smogonDexPrefix) ? 'on the ' +
				'<a href="' + format.info + '">dex page' : 'in the  <a href="' + format.info + '">discussion thread') + '</a>.';
		}

		if (format.genGuide) {
			html += '<br />&nbsp; - Unfamiliar with Gen ' + format.gen + '? Review the <a href="' + format.genGuide + '">mechanics ' +
				'differences</a> before battling.';
		}

		if (format.teams) {
			html += '<br />&nbsp; - Need to borrow a team? Check out the <a href="' + format.teams + '">sample teams thread</a>.';
		}

		if (format.viability) {
			html += '<br />&nbsp; - See how viable each Pokemon is in the <a href="' + format.viability + '">viability rankings ' +
				'thread</a>.';
		}

		if (format.roleCompendium) {
			html += '<br />&nbsp; - Check the common role that each Pokemon plays in the <a href="' + format.roleCompendium + '">role ' +
				'compendium thread</a>.';
		}

		return html;
	}

	/**
	 * Returns a sanitized format ID if valid, or throws if invalid.
	 */
	validateFormat(name: string): string {
		return this.pokemonShowdownDex.validateFormat(name);
	}

	/**
	 * Validates a custom rule (throws if invalid).
	 */
	validateRule(rule: string): [string, string, string, number, string[]] | string {
		return this.pokemonShowdownDex.validateRule(rule);
	}

	getValidatedRuleName(rule: string): string {
		if (rule === 'unreleased') return 'Unreleased';
		if (rule === 'illegal') return 'Illegal';
		if (rule === 'nonexistent') return 'Non-existent';
		const type = rule.charAt(0);
		let ruleName: string;
		if (type === '+' || type === '-' || type === '*' || type === '!') {
			ruleName = rule.substr(1);
		} else {
			ruleName = rule;
		}
		const index = ruleName.indexOf(':');
		const tag = ruleName.substr(0, index);
		ruleName = ruleName.substr(index + 1);
		if (tag === 'ability') {
			ruleName = dexes['base'].getExistingAbility(ruleName).name;
		} else if (tag === 'item') {
			ruleName = dexes['base'].getExistingItem(ruleName).name;
		} else if (tag === 'move') {
			ruleName = dexes['base'].getExistingMove(ruleName).name;
		} else if (tag === 'nature') {
			ruleName = dexes['base'].getExistingNature(ruleName).name;
		} else if (tag === 'pokemon' || tag === 'basepokemon') {
			ruleName = dexes['base'].getExistingPokemon(ruleName).name;
		} else if (tag === 'pokemontag') {
			ruleName = tagNames[ruleName];
		} else {
			const format = this.getFormat(ruleName);
			if (format) ruleName = format.name;
		}

		return ruleName;
	}

	getUsablePokemon(format: IFormat): string[] {
		if (format.usablePokemon) return format.usablePokemon;

		const formatid = format.name + (format.customRules ? "@@@" + format.customRules.join(',') : "");
		const validator = new this.pokemonShowdownValidator(formatid, dexes['base'].pokemonShowdownDex);
		if (!format.ruleTable) format.ruleTable = this.pokemonShowdownDex.getRuleTable(format);

		const formatDex = format.mod in dexes ? dexes[format.mod] : this;
		const littleCup = format.ruleTable.has("littlecup");
		const usablePokemon: string[] = [];
		for (const i of formatDex.data.pokemonKeys) {
			const formes = formatDex.getFormes(formatDex.getExistingPokemon(i));
			for (const forme of formes) {
				// use PS tier in isBannedSpecies()
				const pokemon = formatDex.pokemonShowdownDex.getSpecies(forme);
				if (pokemon.requiredAbility || pokemon.requiredItem || pokemon.requiredItems || pokemon.requiredMove ||
					validator.checkSpecies({}, pokemon, pokemon, {})) continue;

				if (littleCup && !(pokemon.tier === 'LC' || formatDex.isPseudoLCPokemon(pokemon))) continue;

				usablePokemon.push(pokemon.name);
			}
		}

		format.usablePokemon = usablePokemon;
		return usablePokemon;
	}

	combineCustomRules(separatedCustomRules: ISeparatedCustomRules): string[] {
		const customRules: string[] = [];
		for (const ban of separatedCustomRules.addedbans) {
			customRules.push('-' + ban);
		}
		for (const unban of separatedCustomRules.removedbans) {
			customRules.push('+' + unban);
		}
		for (const restriction of separatedCustomRules.addedrestrictions) {
			customRules.push('*' + restriction);
		}
		for (const addedRule of separatedCustomRules.addedrules) {
			customRules.push(addedRule);
		}
		for (const removedRule of separatedCustomRules.removedrules) {
			customRules.push('!' + removedRule);
		}

		return customRules;
	}

	separateCustomRules(customRules: string[]): ISeparatedCustomRules {
		const addedbans: string[] = [];
		const removedbans: string[] = [];
		const addedrestrictions: string[] = [];
		const addedrules: string[] = [];
		const removedrules: string[] = [];
		for (const ruleString of customRules) {
			const rule = this.pokemonShowdownDex.validateRule(ruleString);
			if (typeof rule === 'string') {
				const type = rule.charAt(0);
				const ruleName = this.getValidatedRuleName(rule);

				if (type === '+') {
					removedbans.push(ruleName);
				} else if (type === '-') {
					addedbans.push(ruleName);
				} else if (type === '*') {
					addedrestrictions.push(ruleName);
				} else if (type === '!') {
					removedrules.push(ruleName);
				} else {
					addedrules.push(ruleName);
				}
			} else {
				const complexBans = rule[4].map(x => this.getValidatedRuleName(x));
				if (rule[0] === 'complexTeamBan') {
					addedbans.push(complexBans.join(' ++ '));
				} else {
					addedbans.push(complexBans.join(' + '));
				}
			}
		}

		return {addedbans, removedbans, addedrestrictions, addedrules, removedrules};
	}

	getCustomRulesForPokemonList(pokemon: string[]): string[] {
		return ["-All Pokemon"].concat(pokemon.map(x => "+" + x));
	}

	getCustomFormatNameKey(format: IFormat): string {
		if (!format.customRules || !format.customRules.length) return format.id;
		return format.id + '@@@' + format.customRules.slice().sort().join(',');
	}

	getCustomFormatName(format: IFormat, fullName?: boolean): string {
		if (!format.customRules || !format.customRules.length) return format.name;

		const key = this.getCustomFormatNameKey(format);
		if (!fullName) {
			if (key in this.formatNamesByCustomRules) return this.formatNamesByCustomRules[key];
		}

		if (!format.separatedCustomRules) format.separatedCustomRules = this.separateCustomRules(format.customRules);

		const prefixesAdded: string[] = [];
		let prefixesRemoved: string[] = [];
		let suffixes: string[] = [];

		const removedBansLength = format.separatedCustomRules.removedbans.length;
		const addedRestrictionsLength = format.separatedCustomRules.addedrestrictions.length;

		const addedBans = format.separatedCustomRules.addedbans.slice();
		let onlySuffix = false;
		if (addedBans.length && removedBansLength && !addedRestrictionsLength) {
			if (addedBans.includes(tagNames.allabilities) && !addedBans.map(x => this.getAbility(x)).filter(x => !!x).length) {
				const abilities = format.separatedCustomRules.removedbans.map(x => this.getAbility(x)).filter(x => !!x);
				if (abilities.length === removedBansLength) {
					onlySuffix = true;
					addedBans.splice(addedBans.indexOf(tagNames.allabilities), 1);
					suffixes.push("Only " + Tools.joinList(abilities.map(x => x!.name)));
				}
			} else if (addedBans.includes(tagNames.allitems) && !addedBans.map(x => this.getItem(x)).filter(x => !!x).length) {
				const items = format.separatedCustomRules.removedbans.map(x => this.getItem(x)).filter(x => !!x);
				if (items.length === removedBansLength) {
					onlySuffix = true;
					addedBans.splice(addedBans.indexOf(tagNames.allitems), 1);
					suffixes.push("Only " + Tools.joinList(items.map(x => x!.name)));
				}
			} else if (addedBans.includes(tagNames.allmoves) && !addedBans.map(x => this.getMove(x)).filter(x => !!x).length) {
				const moves = format.separatedCustomRules.removedbans.map(x => this.getMove(x)).filter(x => !!x);
				if (moves.length === removedBansLength) {
					onlySuffix = true;
					addedBans.splice(addedBans.indexOf(tagNames.allmoves), 1);
					suffixes.push("Only " + Tools.joinList(moves.map(x => x!.name)));
				}
			} else if (addedBans.includes(tagNames.allpokemon) && !addedBans.map(x => this.getPokemon(x)).filter(x => !!x).length) {
				const pokemon = format.separatedCustomRules.removedbans.map(x => this.getPokemon(x)).filter(x => !!x);
				if (pokemon.length === removedBansLength) {
					onlySuffix = true;
					addedBans.splice(addedBans.indexOf(tagNames.allpokemon), 1);
					suffixes.push("Only " + Tools.joinList(pokemon.map(x => x!.name)));
				}
			}
		}

		if (addedBans.length) {
			prefixesRemoved = prefixesRemoved.concat(format.separatedCustomRules.addedbans);
		}

		if (removedBansLength && !onlySuffix) {
			suffixes = suffixes.concat(format.separatedCustomRules.removedbans);
		}

		if (addedRestrictionsLength) {
			suffixes = suffixes.concat(format.separatedCustomRules.addedrestrictions);
		}

		if (format.separatedCustomRules.addedrules.length) {
			for (const addedRule of format.separatedCustomRules.addedrules) {
				let rule = addedRule;
				const subFormat = this.getFormat(rule);
				if (subFormat && subFormat.effectType === 'Format' && subFormat.name.startsWith('[Gen')) {
					rule = subFormat.name.substr(subFormat.name.indexOf(']') + 2);
				} else if (rule in clauseNicknames) {
					rule = clauseNicknames[rule];
				}
				prefixesAdded.push(rule);
			}
		}

		if (format.separatedCustomRules.removedrules.length) {
			prefixesRemoved = prefixesRemoved.concat(format.separatedCustomRules.removedrules.map(x => clauseNicknames[x] || x));
		}

		let name = '';
		if (prefixesRemoved.length) name += "(No " + Tools.joinList(prefixesRemoved, null, null, "or") + ") ";
		if (prefixesAdded.length) name += prefixesAdded.join(" ") + " ";
		name += format.name;
		if (suffixes.length) name += " (" + (!onlySuffix ? "Plus " : "") + Tools.joinList(suffixes) + ")";

		if (!fullName) {
			if (name.length > MAX_CUSTOM_NAME_LENGTH) name = format.name + DEFAULT_CUSTOM_RULES_NAME;
			this.formatNamesByCustomRules[key] = name;
		}

		return name;
	}

	getCustomRulesHtml(format: IFormat): string {
		if (!format.separatedCustomRules) format.separatedCustomRules = this.separateCustomRules(format.customRules!);
		const html: string[] = [];
		if (format.separatedCustomRules.addedbans.length) {
			html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Added bans</b>: " + format.separatedCustomRules.addedbans.join(", "));
		}
		if (format.separatedCustomRules.removedbans.length) {
			html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Removed bans</b>: " + format.separatedCustomRules.removedbans.join(", "));
		}
		if (format.separatedCustomRules.addedrestrictions.length) {
			html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Added restrictions</b>: " + format.separatedCustomRules.addedrestrictions.join(", "));
		}
		if (format.separatedCustomRules.addedrules.length) {
			html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Added rules</b>: " + format.separatedCustomRules.addedrules.join(", "));
		}
		if (format.separatedCustomRules.removedrules.length) {
			html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Removed rules</b>: " + format.separatedCustomRules.removedrules.join(", "));
		}
		return html.join("<br />");
	}

	getFormeCombinations(pool: readonly string[], usablePokemon?: readonly string[]): string[][] {
		const poolByFormes: string[][] = [];
		for (const name of pool) {
			const formes = this.getFormes(this.getExistingPokemon(name));
			let filteredFormes: string[] = [];
			if (usablePokemon) {
				for (const forme of formes) {
					if (usablePokemon.includes(forme)) filteredFormes.push(forme);
				}
			} else {
				filteredFormes = formes;
			}

			poolByFormes.push(filteredFormes);
		}

		return Tools.getCombinations(...poolByFormes);
	}

	getPossibleTeamKey(team: readonly string[]): string {
		return team.slice().sort().join(',');
	}

	getPossibleTeams(previousTeams: readonly string[][], pool: readonly string[], options: IGetPossibleTeamsOptions): string[][] {
		if (options.requiredAddition) {
			if (!options.additions) throw new Error("Cannot require 0 additions");
			if (!pool.length) throw new Error("Cannot require " + options.additions + " additions from empty pool");
		}
		if (options.additions && options.additions < 1) throw new Error("Use options.drops instead of negative additions");

		if (options.requiredDrop && !options.drops) throw new Error("Cannot require 0 drops");
		if (options.drops && options.drops < 1) throw new Error("Use options.additions & pool instead of negative drops");

		if (options.requiredEvolution && !options.evolutions) throw new Error("Cannot require 0 evolutions");

		const includedTeamsAfterDrops: Dict<boolean> = {};
		const teamsAfterDrops: string[][] = [];
		if (!options.requiredDrop) {
			for (const previousTeam of previousTeams) {
				includedTeamsAfterDrops[this.getPossibleTeamKey(previousTeam)] = true;
				teamsAfterDrops.push(previousTeam.slice());
			}
		}

		let drops = options.drops || 0;
		if (drops) {
			let largestTeamLength = 0;
			for (const previousTeam of previousTeams) {
				const previousTeamLength = previousTeam.length;
				if (previousTeamLength > largestTeamLength) largestTeamLength = previousTeamLength;

				const maximumDropTeamLength = Math.max(options.additions ? 0 : 1, previousTeamLength - drops);
				const minimumDropTeamLength = options.requiredDrop ? maximumDropTeamLength : Math.max(options.additions ? 0 : 1,
					previousTeamLength - 1);
				const permutations = Tools.getPermutations(previousTeam, maximumDropTeamLength, minimumDropTeamLength);
				for (const permutation of permutations) {
					const key = this.getPossibleTeamKey(permutation);
					if (key in includedTeamsAfterDrops) continue;
					includedTeamsAfterDrops[key] = true;
					teamsAfterDrops.push(permutation);
				}
			}

			drops = Math.min(drops, largestTeamLength - 1);
		}

		let teamsAfterAdditions: string[][] = [];
		if (options.requiredAddition) {
			// teams with no room for additions
			for (const teamAfterDrops of teamsAfterDrops) {
				if (teamAfterDrops.length === 6) {
					teamsAfterAdditions.push(teamAfterDrops.slice());
				}
			}
		} else {
			// not adding Pokemon
			teamsAfterAdditions = teamsAfterDrops.slice();
		}

		let additions = options.additions || 0;
		if (additions) {
			const filteredPool: string[] = [];
			for (const item of pool) {
				let name = item;
				if (options.allowFormes) {
					name = this.getExistingPokemon(name).baseSpecies;
				}

				filteredPool.push(name);
			}

			additions = Math.min(additions, filteredPool.length);

			let combinations: string[][];
			if (options.allowFormes) {
				combinations = this.getFormeCombinations(filteredPool, options.usablePokemon);
			} else {
				combinations = [filteredPool];
			}

			const additionChoices: string[][] = [];
			const checkedPermutations: Dict<boolean> = {};
			for (const combination of combinations) {
				const permutations = Tools.getPermutations(combination, options.requiredAddition ? additions : 1, additions);
				for (const permutation of permutations) {
					const key = this.getPossibleTeamKey(permutation);
					if (key in checkedPermutations) continue;
					checkedPermutations[key] = true;
					additionChoices.push(permutation);
				}
			}

			for (const pokemon of additionChoices) {
				for (const team of teamsAfterDrops) {
					let teamAfterAddition = team.slice();
					teamAfterAddition = teamAfterAddition.concat(pokemon);
					if (teamAfterAddition.length > 6) continue;
					teamsAfterAdditions.push(teamAfterAddition);
				}
			}
		}

		teamsAfterAdditions = teamsAfterAdditions.filter(x => x.length);

		const teamEvolutionFormes: Dict<string[]> = {};
		// build teamEvolutionFormes cache
		if (options.evolutions) {
			const evolve = options.evolutions > 0;
			for (const teamAfterAdditions of teamsAfterAdditions) {
				for (const name of teamAfterAdditions) {
					if (!(name in teamEvolutionFormes)) {
						const pokemon = this.getExistingPokemon(name);
						let evolutionFormes: string[] = [];
						if (evolve) {
							if (pokemon.evos.length) {
								for (const evoName of pokemon.evos) {
									const evo = this.getExistingPokemon(evoName);
									let evos: string[];
									if (options.allowFormes) {
										evos = this.getFormes(evo);
									} else {
										if (evo.forme) continue;
										evos = [evo.name];
									}

									if (options.usablePokemon) {
										for (const forme of evos) {
											if (options.usablePokemon.includes(forme)) {
												evolutionFormes.push(forme);
											}
										}
									} else {
										evolutionFormes = evolutionFormes.concat(evos);
									}
								}
							}
						} else {
							if (pokemon.prevo) {
								const prevo = this.getExistingPokemon(pokemon.prevo);
								let prevos: string[] = [];
								if (options.allowFormes) {
									prevos = this.getFormes(prevo);
								} else {
									if (!prevo.forme) prevos = [prevo.name];
								}

								if (options.usablePokemon) {
									for (const forme of prevos) {
										if (options.usablePokemon.includes(forme)) {
											evolutionFormes.push(forme);
										}
									}
								} else {
									evolutionFormes = evolutionFormes.concat(prevos);
								}
							}
						}

						teamEvolutionFormes[name] = evolutionFormes;
					}
				}
			}
		}

		let teamsAfterEvolutions: string[][] = [];
		const includedTeamsAfterEvolutions: Dict<boolean> = {};
		if (options.requiredEvolution) {
			// teams with no evolutions left
			for (const teamAfterAdditions of teamsAfterAdditions) {
				let teamHasEvolutions = false;
				for (const name of teamAfterAdditions) {
					if (teamEvolutionFormes[name].length) {
						teamHasEvolutions = true;
						break;
					}
				}

				if (!teamHasEvolutions) {
					teamsAfterEvolutions.push(teamAfterAdditions.slice());
				}
			}
		} else {
			// not evolving Pokemon
			teamsAfterEvolutions = teamsAfterAdditions.slice();
		}

		for (const teamAfterEvolutions of teamsAfterEvolutions) {
			includedTeamsAfterEvolutions[this.getPossibleTeamKey(teamAfterEvolutions)] = true;
		}

		if (options.evolutions) {
			for (const teamAfterAdditions of teamsAfterAdditions) {
				const pokemonEvolutions: Dict<string[]> = {};
				const pokemonWithEvolutions: string[] = [];
				const restOfTeam: string[][] = [];
				for (const name of teamAfterAdditions) {
					if (teamEvolutionFormes[name].length) {
						pokemonWithEvolutions.push(name);
						pokemonEvolutions[name] = teamEvolutionFormes[name];
					} else {
						restOfTeam.push([name]);
					}
				}

				if (pokemonWithEvolutions.length) {
					const evolutions = Math.min(pokemonWithEvolutions.length, Math.abs(options.evolutions));
					const evolutionChoices = Tools.getPermutations(pokemonWithEvolutions,
						options.requiredEvolution ? evolutions : 1, evolutions);
					for (const choice of evolutionChoices) {
						const notEvolvingPokemon = restOfTeam.slice();
						if (choice.length < pokemonWithEvolutions.length) {
							for (const pokemon of pokemonWithEvolutions) {
								if (!choice.includes(pokemon)) notEvolvingPokemon.push([pokemon]);
							}
						}

						const combinations = Tools.getCombinations(...notEvolvingPokemon.concat(choice.map(x => pokemonEvolutions[x])));
						for (const combination of combinations) {
							const key = this.getPossibleTeamKey(combination);
							if (key in includedTeamsAfterEvolutions) continue;
							includedTeamsAfterEvolutions[key] = true;

							teamsAfterEvolutions.push(combination);
						}
					}
				} else {
					const key = this.getPossibleTeamKey(teamAfterAdditions);
					if (key in includedTeamsAfterEvolutions) continue;
					includedTeamsAfterEvolutions[key] = true;

					teamsAfterEvolutions.push(teamAfterAdditions);
				}
			}
		}

		for (const teamAfterEvolutions of teamsAfterEvolutions) {
			teamAfterEvolutions.sort();
		}

		teamsAfterEvolutions.sort((a, b) => a.length - b.length);

		return teamsAfterEvolutions;
	}

	includesPokemon(team: IPokemon[] | string[], requiredPokemon: readonly string[]): boolean {
		const pokemonList: string[] = [];
		for (const pokemon of team) {
			pokemonList.push(typeof pokemon === 'string' ? this.getExistingPokemon(pokemon).name : pokemon.name);
		}

		let includes = true;
		for (const pokemon of requiredPokemon) {
			if (!pokemonList.includes(this.getExistingPokemon(pokemon).name)) {
				includes = false;
				break;
			}
		}

		return includes;
	}

	isPossibleTeam(team: IPokemon[] | string[], possibleTeams: DeepImmutable<string[][]>): boolean {
		const names: string[] = [];
		for (const pokemon of team) {
			names.push(typeof pokemon === 'string' ? this.getExistingPokemon(pokemon).name : pokemon.name);
		}

		names.sort();
		possibleTeams = possibleTeams.slice().sort((a, b) => b.length - a.length);

		let isPossible = false;
		for (const possibleTeam of possibleTeams) {
			const copy = possibleTeam.slice();
			copy.sort();
			if (Tools.compareArrays(copy, names)) {
				isPossible = true;
				break;
			}
		}

		return isPossible;
	}

	private cacheAllPossibleMoves(validator: IPokemonShowdownValidator, pokemon: IPokemon): void {
		let possibleMoves: string[] = [];
		let learnsetParent: IPokemon | null = pokemon;
		while (learnsetParent && learnsetParent.gen <= this.gen) {
			const learnsetData = this.getLearnsetData(learnsetParent.id);
			if (!learnsetData || !learnsetData.learnset) {
				let forme: string | undefined;
				if (learnsetParent.changesFrom) {
					forme = typeof learnsetParent.changesFrom === 'string' ? learnsetParent.changesFrom : learnsetParent.changesFrom[0];
				} else {
					forme = learnsetParent.baseSpecies;
				}

				if (forme && forme !== learnsetParent.name) {
					// forme without its own learnset
					learnsetParent = this.getPokemon(forme)!;
					// warning: formes with their own learnset, like Wormadam, should NOT
					// inherit from their base forme unless they're freely switchable
					continue;
				}
				break;
			}

			if ('sketch' in learnsetData.learnset) {
				possibleMoves = Object.keys(this.pokemonShowdownDex.data.Moves);
				break;
			}
			possibleMoves = possibleMoves.concat(Object.keys(learnsetData.learnset));

			const previousLearnsetParent: IPokemon = learnsetParent;
			learnsetParent = validator.learnsetParent(learnsetParent);

			// prevent recursion from calling validator.learnsetParent() directly
			if (learnsetParent && learnsetParent === previousLearnsetParent) break;
		}

		const checkedMoves: string[] = [];
		for (const i of possibleMoves) {
			const move = this.getMove(i)!;
			if (!checkedMoves.includes(move.id) && move.gen <= this.gen && !validator.checkLearnset(move, pokemon)) {
				checkedMoves.push(move.id);
			}
		}

		this.allPossibleMovesCache[pokemon.id] = checkedMoves;
	}

	private cacheIsPseudoLCPokemon(pokemon: IPokemon, lc: IPSFormat): void {
		if (pokemon.tier === 'LC' || pokemon.prevo) {
			this.pseudoLCPokemonCache[pokemon.id] = false;
			return;
		}

		if (lc.exists && (lc.banlist.includes(pokemon.name) || lc.banlist.includes(pokemon.name + "-Base"))) {
			this.pseudoLCPokemonCache[pokemon.id] = false;
			return;
		}

		let invalidEvent: boolean | undefined;
		const learnsetData = this.getLearnsetData(pokemon.id);
		if (learnsetData && learnsetData.eventData && learnsetData.eventOnly) {
			invalidEvent = true;
			for (const event of learnsetData.eventData) {
				if (event.level && event.level <= 5)  {
					invalidEvent = false;
					break;
				}
			}
		}

		let nfe = false;
		if (!invalidEvent && pokemon.evos.length) {
			for (const evo of pokemon.evos) {
				const evolution = this.getPokemon(evo);
				if (evolution && evolution.gen <= this.gen) {
					nfe = true;
					break;
				}
			}
		}

		this.pseudoLCPokemonCache[pokemon.id] = !invalidEvent && nfe;
	}

	private cacheMoveAvailability(move: IMove, pokedex: IPokemon[]): void {
		let availability = 0;
		for (const pokemon of pokedex) {
			if (this.getAllPossibleMoves(pokemon).includes(move.id)) {
				availability++;
			}
		}

		this.moveAvailbilityCache[move.id] = availability;
	}

	private getAllEvolutionLines(pokemon: IPokemon, prevoList?: string[], evolutionLines?: string[][]): string[][] {
		if (!prevoList || !evolutionLines) {
			let firstStage = pokemon;
			while (firstStage.prevo) {
				const prevo = this.getPokemon(firstStage.prevo);
				if (prevo) firstStage = prevo;
			}
			return this.getAllEvolutionLines(firstStage, [], []);
		}

		prevoList = prevoList.slice();
		prevoList.push(pokemon.name);
		if (!pokemon.evos.length) {
			evolutionLines.push(prevoList);
		} else {
			for (const name of pokemon.evos) {
				const evolution = this.getPokemon(name);
				if (evolution) this.getAllEvolutionLines(evolution, prevoList, evolutionLines);
			}
		}
		return evolutionLines;
	}
}

export const instantiate = (): void => {
	const oldDex = global.Dex as Dex | undefined;

	global.Dex = new Dex();
	for (let i = CURRENT_GEN - 1; i >= 1; i--) {
		const mod = 'gen' + i;
		dexes[mod] = new Dex(i, mod);
	}

	if (oldDex) {
		global.Dex.onReload(oldDex);
	}
};