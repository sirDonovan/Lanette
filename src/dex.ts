import path = require('path');

import type { Room } from './rooms';
import type {
	IAbility, IAbilityCopy, IDataTable, IFormat, IFormatLinks, IGetPossibleTeamsOptions, IGifData,
	IItem, IItemCopy, ILearnsetData, IMove, IMoveCopy, INature, IPokemon, IPokemonCopy, ISeparatedCustomRules, ITypeData,
	IPokemonShowdownDex, IValidator
} from './types/dex';

let pokemonShowdownDexBase: IPokemonShowdownDex;
let pokemonShowdownTeamValidator: IValidator;
let formatLinks: Dict<IFormatLinks | undefined>;

const currentGen = 8;
const currentGenString = 'gen' + currentGen;

const natures: Dict<INature> = {
	adamant: {name: "Adamant", plus: 'atk', minus: 'spa'},
	bashful: {name: "Bashful"},
	bold: {name: "Bold", plus: 'def', minus: 'atk'},
	brave: {name: "Brave", plus: 'atk', minus: 'spe'},
	calm: {name: "Calm", plus: 'spd', minus: 'atk'},
	careful: {name: "Careful", plus: 'spd', minus: 'spa'},
	docile: {name: "Docile"},
	gentle: {name: "Gentle", plus: 'spd', minus: 'def'},
	hardy: {name: "Hardy"},
	hasty: {name: "Hasty", plus: 'spe', minus: 'def'},
	impish: {name: "Impish", plus: 'def', minus: 'spa'},
	jolly: {name: "Jolly", plus: 'spe', minus: 'spa'},
	lax: {name: "Lax", plus: 'def', minus: 'spd'},
	lonely: {name: "Lonely", plus: 'atk', minus: 'def'},
	mild: {name: "Mild", plus: 'spa', minus: 'def'},
	modest: {name: "Modest", plus: 'spa', minus: 'atk'},
	naive: {name: "Naive", plus: 'spe', minus: 'spd'},
	naughty: {name: "Naughty", plus: 'atk', minus: 'spd'},
	quiet: {name: "Quiet", plus: 'spa', minus: 'spe'},
	quirky: {name: "Quirky"},
	rash: {name: "Rash", plus: 'spa', minus: 'spd'},
	relaxed: {name: "Relaxed", plus: 'def', minus: 'spe'},
	sassy: {name: "Sassy", plus: 'spd', minus: 'spe'},
	serious: {name: "Serious"},
	timid: {name: "Timid", plus: 'spe', minus: 'atk'},
};

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
};

const gen2Items: string[] = ['berserkgene', 'berry', 'bitterberry', 'burntberry', 'goldberry', 'iceberry', 'mintberry', 'miracleberry',
	'mysteryberry', 'pinkbow', 'polkadotbow', 'przcureberry', 'psncureberry'];

const customRuleFormats: Dict<string> = {
	uubl: 'UU@@@+UUBL',
	rubl: 'RU@@@+RUBL',
	nubl: 'NU@@@+NUBL',
	publ: 'PU@@@+PUBL',
};

const customRuleAliases: Dict<string[]> = {
	uu: ['-All pokemon', '+LC', '+LC Uber', '+NFE', '+ZU', '+PU', '+PUBL', '+NU', '+NUBL', '+RU', '+RUBL', '+UU'],
	ru: ['-All pokemon', '+LC', '+LC Uber', '+NFE', '+ZU', '+PU', '+PUBL', '+NU', '+NUBL', '+RU'],
	nu: ['-All pokemon', '+LC', '+LC Uber', '+NFE', '+ZU', '+PU', '+PUBL', '+NU'],
	pu: ['-All pokemon', '+LC', '+LC Uber', '+NFE', '+ZU', '+PU'],
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
	readonly currentGenString: typeof currentGenString = currentGenString;
	dexes: Dict<Dex> = dexes;
	readonly omotms: string[] = [];
	readonly tagNames: typeof tagNames = tagNames;

	dataCache: IDataTable | null = null;

	readonly abilityCache = new Map<string, IAbility>();
	readonly allPossibleMovesCache = new Map<string, string[]>();
	readonly formatCache = new Map<string, IFormat>();
	readonly itemCache = new Map<string, IItem>();
	readonly learnsetDataCache = new Map<string, ILearnsetData>();
	readonly moveCache = new Map<string, IMove>();
	readonly moveAvailbilityCache = new Map<string, number>();
	readonly pokemonCache = new Map<string, IPokemon>();
	readonly typeCache = new Map<string, ITypeData>();

	readonly currentMod: string;
	readonly gen: number;
	readonly isBase: boolean;
	readonly pokemonShowdownDex: IPokemonShowdownDex;

	private abilitiesList: readonly IAbility[] | null = null;
	private itemsList: readonly IItem[] | null = null;
	private movesList: readonly IMove[] | null = null;
	private pokemonList: readonly IPokemon[] | null = null;

	constructor(gen?: number, mod?: string) {
		if (!gen) gen = currentGen;
		if (!mod) mod = 'base';
		const isBase = mod === 'base';
		if (isBase) {
			dexes['base'] = this;
			dexes[currentGenString] = this;
			this.pokemonShowdownDex = pokemonShowdownDexBase;
		} else {
			this.pokemonShowdownDex = pokemonShowdownDexBase.mod(mod);
		}

		this.currentMod = mod;
		this.gen = gen;
		this.isBase = isBase;
	}

	onReload(previous: Partial<Dex>): void {
		this.loadData();

		for (const mod in previous.dexes) {
			if (previous.dexes[mod] === previous) continue;
			const dex = previous.dexes[mod];
			for (const i in dex) {
				// @ts-expect-error
				delete dex[i];
			}
		}

		for (const i in previous) {
			// @ts-expect-error
			delete previous[i];
		}
	}

	getDex(mod?: string): Dex {
		if (!mod) mod = currentGenString;
		return dexes[mod];
	}

	get data(): IDataTable {
		if (!this.dataCache) this.loadData();
		return this.dataCache!;
	}

	loadData(): void {
		if (this.dataCache) return;

		if (this.isBase) {
			console.log("Loading dex data...");
			this.pokemonShowdownDex.includeModData();
		}

		const lanetteDataDir = path.join(Tools.rootFolder, 'data');

		// eslint-disable-next-line @typescript-eslint/no-var-requires
		formatLinks = require(path.join(lanetteDataDir, 'format-links.js')) as Dict<IFormatLinks | undefined>;

		/* eslint-disable @typescript-eslint/no-var-requires */
		const alternateIconNumbers = require(path.join(lanetteDataDir, 'alternate-icon-numbers.js')) as
			{right: Dict<number>; left: Dict<number>};
		const badges = require(path.join(lanetteDataDir, 'badges.js')) as string[];
		const categories = require(path.join(lanetteDataDir, 'categories.js')) as Dict<string>;
		const characters = require(path.join(lanetteDataDir, 'characters.js')) as string[];
		const locations = require(path.join(lanetteDataDir, 'locations.js')) as string[];
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const gifData = require(path.join(lanetteDataDir, 'pokedex-mini.js')).BattlePokemonSprites as Dict<IGifData | undefined>;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const gifDataBW = require(path.join(lanetteDataDir, 'pokedex-mini-bw.js')).BattlePokemonSpritesBW as Dict<IGifData | undefined>;
		const trainerClasses = require(path.join(lanetteDataDir, 'trainer-classes.js')) as string[];

		const trainerSpriteList = require(path.join(lanetteDataDir, 'trainer-sprites.js')) as string[];
		const trainerSprites: Dict<string> = {};
		for (const trainer of trainerSpriteList) {
			trainerSprites[Tools.toId(trainer)] = trainer;
		}
		/* eslint-enable */

		const speciesList = Object.keys(categories);
		for (const species of speciesList) {
			const id = Tools.toId(species);
			if (id === species) continue;
			categories[id] = categories[species];
			delete categories[species];
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

		const colors: Dict<string> = {};
		const eggGroups: Dict<string> = {};

		const validator = new pokemonShowdownTeamValidator("gen" + this.gen + "ou", dexes['base'].pokemonShowdownDex);
		const pokemonKeys = Object.keys(this.pokemonShowdownDex.data.Pokedex);
		const filteredPokemonKeys: string[] = [];
		const moveAvailbilityPokemonList: IPokemon[] = [];
		for (const key of pokemonKeys) {
			const pokemon = this.getPokemon(key)!;
			if (pokemon.gen > this.gen) continue;

			this.cacheAllPossibleMoves(validator, pokemon);
			filteredPokemonKeys.push(key);
			moveAvailbilityPokemonList.push(pokemon);

			if (pokemon.color) {
				const id = Tools.toId(pokemon.color);
				if (!(id in colors)) {
					colors[id] = pokemon.color;
				}
			}

			if (pokemon.eggGroups) {
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

		const data: IDataTable = {
			abilityKeys: filteredAbilityKeys,
			formatKeys: Object.keys(this.pokemonShowdownDex.data.Formats),
			itemKeys: filteredItemKeys,
			learnsetDataKeys: Object.keys(this.pokemonShowdownDex.data.Learnsets),
			moveKeys: filteredMoveKeys,
			pokemonKeys: filteredPokemonKeys,
			typeKeys: Object.keys(this.pokemonShowdownDex.data.TypeChart).map(x => Tools.toId(x)),
			alternateIconNumbers,
			badges,
			categories,
			characters,
			colors,
			eggGroups,
			gifData,
			gifDataBW,
			locations,
			natures,
			trainerClasses,
			trainerSprites,
		};

		if (this.isBase) console.log("Loaded dex data");

		this.dataCache = data;
	}

	async fetchClientData(): Promise<void> {
		const files = ['pokedex-mini.js', 'pokedex-mini-bw.js'];
		for (const fileName of files) {
			const file = await Tools.fetchUrl('https://' + Tools.mainServer + '/data/' + fileName);
			if (typeof file !== 'string') {
				console.log(file);
			} else if (file) {
				await Tools.safeWriteFile(path.join(Tools.rootFolder, 'data', fileName), file);
			}
		}
	}

	/*
		Abilities
	*/

	getAbility(name: string): IAbility | undefined {
		const id = Tools.toId(name);
		const cached = this.abilityCache.get(id);
		if (cached) return cached;

		const ability = this.pokemonShowdownDex.getAbility(name);
		if (!ability.exists) return undefined;

		this.abilityCache.set(id, ability);
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

	/** Returns a list of existing abilities
	 *
	 * filterAbility: Return `false` to filter `ability` out of the list
	 */
	getAbilitiesList(filter?: (ability: IAbility) => boolean): IAbility[] {
		const abilities: IAbility[] = [];
		for (const i of this.data.abilityKeys) {
			const ability = this.getExistingAbility(i);
			if (ability.isNonstandard === 'CAP' || ability.isNonstandard === 'LGPE' || ability.isNonstandard === 'Custom' ||
				ability.id === 'noability' || ability.gen > this.gen || (filter && !filter(ability))) continue;
			abilities.push(ability);
		}
		return abilities;
	}

	/** Returns a list of existing, copied abilities
	 *
	 * filterMove: Return `false` to filter `ability` out of the list
	 */
	getAbilitiesCopyList(filter?: (ability: IAbility) => boolean): IAbilityCopy[] {
		return this.getAbilitiesList(filter).map(x => this.getAbilityCopy(x));
	}

	/*
		Items
	*/

	getItem(name: string): IItem | undefined {
		const id = Tools.toId(name);
		const cached = this.itemCache.get(id);
		if (cached) return cached;

		const item = this.pokemonShowdownDex.getItem(name);
		if (!item.exists) return undefined;

		this.itemCache.set(id, item);
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

	/** Returns a list of existing items
	 *
	 * filterItem: Return `false` to filter `item` out of the list
	 */
	getItemsList(filter?: (item: IItem) => boolean): IItem[] {
		const items: IItem[] = [];
		for (const i of this.data.itemKeys) {
			const item = this.getExistingItem(i);
			if (item.isNonstandard === 'CAP' || item.isNonstandard === 'LGPE' || item.isNonstandard === 'Custom' || item.gen > this.gen ||
				(this.gen !== 2 && gen2Items.includes(item.id)) || (filter && !filter(item))) continue;
			items.push(item);
		}
		return items;
	}

	/** Returns a list of existing, copied items
	 *
	 * filterMove: Return `false` to filter `item` out of the list
	 */
	getItemsCopyList(filter?: (item: IItem) => boolean): IItemCopy[] {
		return this.getItemsList(filter).map(x => this.getItemCopy(x));
	}

	getLearnsetData(name: string): ILearnsetData | undefined {
		const id = Tools.toId(name);
		const cached = this.learnsetDataCache.get(id);
		if (cached) return cached;

		const learnsetData = this.pokemonShowdownDex.getLearnsetData(id);
		if (!learnsetData.exists) return undefined;

		this.learnsetDataCache.set(id, learnsetData);
		return learnsetData;
	}

	/*
		Moves
	*/

	getMove(name: string): IMove | undefined {
		const id = Tools.toId(name);
		const cached = this.moveCache.get(id);
		if (cached) return cached;

		const move = this.pokemonShowdownDex.getMove(name);
		if (!move.exists) return undefined;

		this.moveCache.set(id, move);
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

	/** Returns a list of existing moves
	 *
	 * filterMove: Return `false` to filter `move` out of the list
	 */
	getMovesList(filter?: (move: IMove) => boolean): IMove[] {
		const moves: IMove[] = [];
		for (const i of this.data.moveKeys) {
			const move = this.getExistingMove(i);
			if (move.isNonstandard === 'CAP' || move.isNonstandard === 'LGPE' || move.isNonstandard === 'Custom' || move.gen > this.gen ||
				(filter && !filter(move))) continue;
			moves.push(move);
		}
		return moves;
	}

	/** Returns a list of existing, copied moves
	 *
	 * filterMove: Return `false` to filter `move` out of the list
	 */
	getMovesCopyList(filter?: (move: IMove) => boolean): IMoveCopy[] {
		return this.getMovesList(filter).map(x => this.getMoveCopy(x));
	}

	getMoveAvailability(move: IMove): number {
		if (move.gen > this.gen) throw new Error("Dex.getMoveAvailability called for " + move.name + " in gen " + this.gen);
		return this.moveAvailbilityCache.get(move.id)!;
	}

	/*
		Pokemon
	*/

	getPokemon(name: string): IPokemon | undefined {
		const id = Tools.toId(name);
		const cached = this.pokemonCache.get(id);
		if (cached) return cached;

		const pokemon = Tools.deepClone(this.pokemonShowdownDex.getSpecies(name));
		if (!pokemon.exists) return undefined;

		if (pokemon.tier === '(NU)') {
			pokemon.tier = 'PU';
		} else if (pokemon.tier === '(PU)') {
			pokemon.tier = 'ZU';
		}

		this.pokemonCache.set(id, pokemon);
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

	/** Returns a list of existing Pokemon
	 *
	 * filterPokemon: Return `false` to filter `pokemon` out of the list
	 */
	getPokemonList(filter?: (pokemon: IPokemon) => boolean): IPokemon[] {
		const pokedex: IPokemon[] = [];
		for (const i of this.data.pokemonKeys) {
			const pokemon = this.getExistingPokemon(i);
			if (pokemon.isNonstandard === 'CAP' || pokemon.isNonstandard === 'LGPE' || pokemon.isNonstandard === 'Custom' ||
				pokemon.gen > this.gen || (filter && !filter(pokemon))) continue;
			pokedex.push(pokemon);
		}
		return pokedex;
	}

	getPokemonCategory(pokemon: IPokemon): string {
		return this.data.categories[pokemon.id] || '';
	}

	getAllPossibleMoves(pokemon: IPokemon): string[] {
		if (pokemon.gen > this.gen) throw new Error("Dex.getAllPossibleMoves() called on " + pokemon.name + " in gen " + this.gen);
		return this.allPossibleMovesCache.get(pokemon.id)!;
	}

	getEvolutionLines(pokemon: IPokemon, includedFormes?: string[]): string[][] {
		const potentialEvolutionLines: string[][] = this.getAllEvolutionLines(pokemon);
		const formesToCheck: string[] = [pokemon.name];
		if (includedFormes) {
			for (const includedForme of includedFormes) {
				const forme = this.getExistingPokemon(includedForme);
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
		return matchingEvolutionLines;
	}

	isEvolutionFamily(speciesList: string[]): boolean {
		if (speciesList.length < 2) return true;

		const evolutionLines: string[][][] = [];

		for (const species of speciesList) {
			const pokemon = this.getPokemon(species);
			if (!pokemon) return false;
			evolutionLines.push(this.getEvolutionLines(pokemon));
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

			if (!sharedEvolutionLine) return false;
		}

		return true;
	}

	getType(name: string): ITypeData | undefined {
		const id = Tools.toId(name);
		const cached = this.typeCache.get(id);
		if (cached) return cached;

		const type = this.pokemonShowdownDex.getType(name);
		if (!type.exists) return undefined;

		if (!type.id) type.id = Tools.toId(type.name);
		this.typeCache.set(id, type);
		return type;
	}

	getExistingType(name: string): ITypeData {
		const type = this.getType(name);
		if (!type) throw new Error("No type returned for '" + name + "'");
		return type;
	}

	/**
	 * Returns true if target is immune to source
	 */
	isImmune(source: IMove | string, target: string | readonly string[] | IPokemon): boolean {
		const sourceType = (typeof source === 'string' ? source : source.type);
		let targetType: string | readonly string[];
		if (typeof target === 'string') {
			const pokemon = this.getPokemon(target);
			if (pokemon) {
				targetType = pokemon.types;
			} else {
				targetType = target;
			}
		} else if (Array.isArray(target)) {
			targetType = target;
		} else {
			// @ts-expect-error
			targetType = target.types as string[];
		}
		if (Array.isArray(targetType)) {
			for (const type of targetType) {
				if (this.isImmune(sourceType, type)) return true;
			}
			return false;
		} else {
			targetType = targetType as string;
			const typeData = this.getType(targetType);
			if (typeData && typeData.damageTaken[sourceType] === 3) return true;
		}
		return false;
	}

	isPseudoLCPokemon(pokemon: IPokemon): boolean {
		// LC handling, checks for LC Pokemon in higher tiers that need to be handled separately,
		// as well as event-only Pokemon that are not eligible for LC despite being the first stage
		if (pokemon.tier === 'LC' || pokemon.prevo) return false;

		const lcFormat = this.getFormat('lc');
		if (lcFormat && (lcFormat.banlist.includes(pokemon.name) || lcFormat.banlist.includes(pokemon.name + "-Base"))) return false;

		let invalidEvent = true;
		const learnsetData = this.getLearnsetData(pokemon.id);
		if (learnsetData && learnsetData.eventData && learnsetData.eventOnly) {
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

		return !invalidEvent && nfe;
	}

	/**
	 * Returns >=1 if super-effective, <=1 if not very effective
	 */
	getEffectiveness(source: IMove | string, target: IPokemon | string | readonly string[]): number {
		const sourceType = (typeof source === 'string' ? source : source.type);
		let targetType;
		if (typeof target === 'string') {
			const pokemon = this.getPokemon(target);
			if (pokemon) {
				targetType = pokemon.types;
			} else {
				targetType = target;
			}
		} else if (Array.isArray(target)) {
			targetType = target;
		} else {
			// @ts-expect-error
			targetType = target.types as string[];
		}
		if (Array.isArray(targetType)) {
			let totalTypeMod = 0;
			for (const type of targetType) {
				totalTypeMod += this.getEffectiveness(sourceType, type);
			}
			return totalTypeMod;
		} else {
			targetType = targetType as string;
			const typeData = this.getType(targetType);
			if (!typeData) return 0;
			switch (typeData.damageTaken[sourceType]) {
			case 1: return 1; // super-effective
			case 2: return -1; // resist
			// in case of weird situations like Gravity, immunity is
			// handled elsewhere
			default: return 0;
			}
		}
	}

	getWeaknesses(pokemon: IPokemon): string[] {
		const weaknesses: string[] = [];
		for (const key of this.data.typeKeys) {
			const type = this.getExistingType(key);
			const isImmune = this.isImmune(type.name, pokemon);
			const effectiveness = this.getEffectiveness(type.name, pokemon);
			if (!isImmune && effectiveness >= 1) weaknesses.push(type.name);
		}
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

	getFormat(name: string, isValidated?: boolean): IFormat | undefined {
		const id = Tools.toId(name);
		if (!id) return;

		const inputTarget = name;
		let customRules: string[] | undefined;
		let format = this.pokemonShowdownDex.getFormat(name, isValidated);
		if (!format.exists) {
			if (id in customRuleFormats) {
				name = customRuleFormats[id];
			} else {
				const [formatAlias, customRulesString] = name.split('@@@', 2);
				customRules = customRulesString ? customRulesString.split(',') : [];
				const parts = formatAlias.split(" ");
				if (parts.length > 1) {
					let formatNameIndex = parts.length - 1;
					for (let i = 0; i < parts.length - 1; i++) {
						const id = Tools.toId(parts[i]);
						if (id in customRuleAliases) {
							for (const rule of customRuleAliases[id]) {
								if (!customRules.includes(rule)) customRules.push(rule);
							}
						} else {
							formatNameIndex = i;
							break;
						}
					}

					name = parts.slice(formatNameIndex).join(" ") + (customRules.length ? "@@@" + customRules.join(',') : "");
				}
			}

			format = this.pokemonShowdownDex.getFormat(name, isValidated);

			if (!format.exists) {
				for (let i = currentGen - 1; i >= 1; i--) {
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

		let viability: string | undefined;
		let np: string | undefined;
		let info: string | undefined;
		if (format.threads) {
			const threads = format.threads.slice();
			for (let line of threads) {
				line = line.trim();
				if (line.startsWith('&bullet;')) {
					const text = line.split('</a>')[0].split('">')[1];
					if (!text) continue;
					if (text.includes('Viability Ranking')) {
						const link = line.split('<a href="');
						if (link[1]) {
							viability = link[1].split('/">')[0].split('/').pop()!;
						}
					} else if (text.startsWith("np:") || text.includes(format.name + " Stage")) {
						const link = line.split('<a href="');
						if (link[1]) {
							np = link[1].split('/">')[0].split('/').pop()!;
						}
					} else if (Tools.toId(text) === format.id) {
						const link = line.split('<a href="');
						if (link[1]) {
							info = link[1].split('/">')[0].split('/').pop()!;
						}
					}
				}
			}

			if (format.id in formatLinks) {
				format = Object.assign(formatLinks[format.id], format, {
					'info-official': info,
					'np-official': np,
					'viability-official': viability,
				});
			} else {
				format.info = info;
				format.np = np;
				format.viability = viability;
			}

			const links: ('info' | 'np' | 'roleCompendium' | 'teams' | 'viability')[] = ['info', 'np', 'roleCompendium', 'teams',
					'viability'];
			for (const id of links) {
				const link = format[id];
				if (!link) continue;
				let num = parseInt(link.split("/")[0]);
				if (isNaN(num)) continue;
				// @ts-expect-error
				if (format[id + '-official']) {
					// @ts-expect-error
					const officialNum = parseInt(format[id + '-official']);
					if (!isNaN(officialNum) && officialNum > num) num = officialNum;
				}
				format[id] = 'http://www.smogon.com/forums/threads/' + num;
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
			if (format.info && !format.team) {
				html += ' More info ';
				if (format.userHosted) {
					html += 'on the <a href="' + format.info + '">official page</a>';
				} else if (format.info.startsWith('https://www.smogon.com/dex/')) {
					html += 'on the  <a href="' + format.info + '">dex page</a>';
				} else {
					html += 'in the  <a href="' + format.info + '">discussion thread</a>';
				}
			}
		} else if (format.info) {
			if (format.userHosted) {
				html += '<br />&nbsp; - Description and more info on the <a href="' + format.info + '">official page</a>.';
				if (format.generator) {
					html += '<br />&nbsp; - Use our <a href="' + format.generator + '">random generator</a> to ease the hosting process.';
				}
			} else {
				html += '<br />&nbsp; - Description and more info ' + (format.info.startsWith('https://www.smogon.com/dex/') ? 'on the ' +
					'<a href="' + format.info + '">dex page' : 'in the  <a href="' + format.info + '">discussion thread') + '</a>.';
			}
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
		if (!format.ruleTable) format.ruleTable = this.pokemonShowdownDex.getRuleTable(format);

		const formatGen = format.mod in dexes ? dexes[format.mod].gen : this.gen;
		const littleCup = format.ruleTable.has("littlecup");
		const usablePokemon: string[] = [];
		for (const i of this.data.pokemonKeys) {
			// use PS tier in isBannedSpecies()
			const pokemon = this.pokemonShowdownDex.getSpecies(i);
			if (pokemon.requiredAbility || pokemon.requiredItem || pokemon.requiredItems || pokemon.requiredMove ||
				format.ruleTable.isBannedSpecies(pokemon)) continue;
			if (littleCup) {
				if ((pokemon.prevo && this.getExistingPokemon(pokemon.prevo).gen <= formatGen) || !pokemon.nfe) continue;
			}

			usablePokemon.push(pokemon.name);
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

	getCustomFormatName(format: IFormat, room?: Room, showAll?: boolean): string {
		if (!format.customRules || !format.customRules.length) return format.name;
		if (!format.separatedCustomRules) format.separatedCustomRules = this.separateCustomRules(format.customRules);
		const defaultCustomRules: Partial<ISeparatedCustomRules> = room && room.id in Tournaments.defaultCustomRules ?
			Tournaments.defaultCustomRules[room.id] : {};
		const bansLength = format.separatedCustomRules.addedbans.length;
		const unbansLength = format.separatedCustomRules.removedbans.length;
		const restrictionsLength = format.separatedCustomRules.addedrestrictions.length;
		const addedRulesLength = format.separatedCustomRules.addedrules.length;
		const removedRulesLength = format.separatedCustomRules.removedrules.length;

		const prefixesAdded: string[] = [];
		let prefixesRemoved: string[] = [];
		let suffixes: string[] = [];

		if (showAll || (bansLength <= 2 && unbansLength <= 2 && addedRulesLength <= 2 && removedRulesLength <= 2)) {
			if (bansLength && (!defaultCustomRules.addedbans ||
				format.separatedCustomRules.addedbans.join(",") !== defaultCustomRules.addedbans.join(","))) {
				prefixesRemoved = prefixesRemoved.concat(format.separatedCustomRules.addedbans);
			}
			if (unbansLength && (!defaultCustomRules.removedbans ||
				format.separatedCustomRules.removedbans.join(",") !== defaultCustomRules.removedbans.join(","))) {
				suffixes = suffixes.concat(format.separatedCustomRules.removedbans);
			}
			if (restrictionsLength && (!defaultCustomRules.addedrestrictions ||
				format.separatedCustomRules.addedrestrictions.join(",") !== defaultCustomRules.addedrestrictions.join(","))) {
				suffixes = suffixes.concat(format.separatedCustomRules.addedrestrictions);
			}
			if (addedRulesLength && (!defaultCustomRules.addedrules ||
				format.separatedCustomRules.addedrules.join(",") !== defaultCustomRules.addedrules.join(","))) {
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
			if (removedRulesLength && (!defaultCustomRules.removedrules ||
				format.separatedCustomRules.removedrules.join(",") !== defaultCustomRules.removedrules.join(","))) {
				prefixesRemoved = prefixesRemoved.concat(format.separatedCustomRules.removedrules.map(x => clauseNicknames[x] || x));
			}

			let name = '';
			if (prefixesRemoved.length) name += "(No " + Tools.joinList(prefixesRemoved, null, null, "or") + ") ";
			if (prefixesAdded.length) name += prefixesAdded.join("-") + " ";
			name += format.name;
			if (suffixes.length) name += " (Plus " + Tools.joinList(suffixes) + ")";
			return name;
		} else {
			return format.name;
		}
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

	getFormeCombinations(pool: readonly IPokemon[] | readonly string[]): string[][] {
		const poolByFormes: string[][] = [];
		for (const name of pool) {
			const pokemon = typeof name === 'string' ? this.getExistingPokemon(name) : name;
			const baseSpecies = this.getExistingPokemon(pokemon.baseSpecies);
			const formes: string[] = [baseSpecies.name];
			if (baseSpecies.otherFormes) {
				for (const otherForme of baseSpecies.otherFormes) {
					const forme = this.getExistingPokemon(otherForme);
					if (!forme.battleOnly) formes.push(forme.name);
				}
			}

			poolByFormes.push(formes);
		}

		return Tools.getCombinations(...poolByFormes);
	}

	getPossibleTeams(previousTeams: readonly string[][], pool: readonly IPokemon[] | readonly string[], options: IGetPossibleTeamsOptions):
		string[][] {
		const additions = options.additions || 0;
		let evolutions = options.evolutions || 0;

		let combinations: string[][];
		if (options.allowFormes) {
			combinations = this.getFormeCombinations(pool);
		} else {
			const names: string[] = [];
			for (const pokemon of pool) {
				if (typeof pokemon === 'string') {
					names.push(this.getExistingPokemon(pokemon).name);
				} else {
					names.push(pokemon.name);
				}
			}

			combinations = [names];
		}

		const possibleAdditions: string[][] = [];
		const checkedPermutations: Dict<boolean> = {};
		for (const combination of combinations) {
			const permutations = Tools.getPermutations(combination, 1);
			for (const permutation of permutations) {
				const sorted = permutation.slice();
				sorted.sort();
				const key = sorted.join(',');
				if (key in checkedPermutations) continue;
				checkedPermutations[key] = true;

				if (permutation.length <= additions) possibleAdditions.push(permutation);
			}
		}

		let baseTeams: string[][];
		if (options.requiredAddition) {
			baseTeams = [];
		} else {
			// not adding Pokemon
			baseTeams = previousTeams.slice();
		}

		for (const pokemon of possibleAdditions) {
			for (const previousTeam of previousTeams) {
				let team = previousTeam.slice();
				team = team.concat(pokemon);
				if (team.length > 6) continue;
				baseTeams.push(team);
			}
		}

		let finalTeams: string[][];
		if (options.requiredEvolution) {
			finalTeams = [];
		} else {
			// not evolving Pokemon
			finalTeams = baseTeams.slice();
		}

		let currentTeams = baseTeams.slice();
		const nextTeams: string[][] = [];
		if (evolutions > 0) {
			while (evolutions > 0) {
				for (const team of currentTeams) {
					let availableEvolutions = false;
					for (let i = 0; i < team.length; i++) {
						const pokemon = this.getExistingPokemon(team[i]);
						if (!pokemon.nfe) continue;
						const pokemonSlot = i;
						for (const evo of pokemon.evos) {
							const evolution = this.getExistingPokemon(evo);
							if (evolution.forme && !options.allowFormes) continue;
							availableEvolutions = true;
							const newTeam = team.slice();
							newTeam[pokemonSlot] = evolution.name;
							finalTeams.push(newTeam);
							nextTeams.push(newTeam);
						}
					}
					if (!availableEvolutions) finalTeams.push(team);
				}
				currentTeams = nextTeams;
				evolutions--;
			}
		} else if (evolutions < 0) {
			// check that there are evolutions left
			while (evolutions < 0) {
				for (const team of currentTeams) {
					let availableEvolutions = false;
					for (let i = 0; i < team.length; i++) {
						const pokemon = this.getExistingPokemon(team[i]);
						if (!pokemon.prevo) continue;
						availableEvolutions = true;
						const pokemonSlot = i;
						const prevo = this.getExistingPokemon(pokemon.prevo);
						let prevos: string[];
						if (options.allowFormes) {
							const basePrevo = this.getExistingPokemon(prevo.baseSpecies);
							prevos = [basePrevo.name];
							if (basePrevo.otherFormes) {
								for (const otherForme of basePrevo.otherFormes) {
									const forme = this.getExistingPokemon(otherForme);
									if (!forme.battleOnly) prevos.push(forme.name);
								}
							}
						} else {
							prevos = [prevo.name];
						}

						for (const name of prevos) {
							const newTeam = team.slice();
							newTeam[pokemonSlot] = name;
							finalTeams.push(newTeam);
							nextTeams.push(newTeam);
						}
					}
					if (!availableEvolutions) finalTeams.push(team);
				}
				currentTeams = nextTeams;
				evolutions++;
			}
		}

		for (const team of finalTeams) {
			team.sort();
		}

		finalTeams.sort((a, b) => a.length - b.length);

		return finalTeams;
	}

	includesPokemon(team: IPokemon[] | string[], requiredPokemon: string[]): boolean {
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
			const team = possibleTeam.slice();
			team.sort();
			if (Tools.compareArrays(team, names)) {
				isPossible = true;
				break;
			}
		}

		return isPossible;
	}

	private cacheAllPossibleMoves(validator: IValidator, pokemon: IPokemon): void {
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

			if (learnsetData && learnsetData.learnset) possibleMoves = possibleMoves.concat(Object.keys(learnsetData.learnset));

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

		this.allPossibleMovesCache.set(pokemon.id, checkedMoves);
	}

	private cacheMoveAvailability(move: IMove, pokedex: IPokemon[]): void {
		let availability = 0;
		for (const pokemon of pokedex) {
			if (this.getAllPossibleMoves(pokemon).includes(move.id)) {
				availability++;
			}
		}

		this.moveAvailbilityCache.set(move.id, availability);
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
	const oldDex: Dex | undefined = global.Dex;

	// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
	pokemonShowdownDexBase = require(path.join(Tools.pokemonShowdownFolder, ".sim-dist", "dex.js")).Dex as IPokemonShowdownDex;
	// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
	pokemonShowdownTeamValidator = require(path.join(Tools.pokemonShowdownFolder, ".sim-dist", "team-validator.js")).TeamValidator;

	global.Dex = new Dex();
	for (let i = currentGen - 1; i >= 1; i--) {
		const mod = 'gen' + i;
		dexes[mod] = new Dex(i, mod);
	}

	if (oldDex) {
		global.Dex.onReload(oldDex);
		Tools.updateNodeModule(__filename, module);
	}
};