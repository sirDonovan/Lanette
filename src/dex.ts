import path = require('path');

import { badges as badgeData } from './data/badges';
import { categories as categoryData } from './data/categories';
import { characters as characterData } from './data/characters';
import { formatLinks } from './data/format-links';
import { locations as locationData } from './data/locations';
import { trainerClasses } from './data/trainer-classes';
import type {
	CategoryData, CharacterType, ModelGeneration, IAlternateIconNumbers, IDataTable, IGetPossibleTeamsOptions, IGifData,
	IGifDirectionData, ISeparatedCustomRules, LocationType, RegionName, IClosestPossibleTeam, TrainerSpriteId
} from './types/dex';
import type {
	IAbility, IAbilityCopy, IFormat, IItem, IItemCopy, ILearnsetData, IMove, IMoveCopy, INature, IPokemon, IPokemonCopy,
	IPokemonShowdownDex, IPokemonShowdownValidator, IPSFormat, ITypeData, RuleTable, ValidatedRule
} from './types/pokemon-showdown';
import type { IParsedSmogonLink } from './types/tools';

const MAX_CUSTOM_NAME_LENGTH = 100;
const DEFAULT_CUSTOM_RULES_NAME = " (with custom rules)";
const CURRENT_GEN = 8;
const CURRENT_GEN_STRING = 'gen' + CURRENT_GEN;
const POKEMON_ICON_HEIGHT = 30;
const POKEMON_ICON_WIDTH = 40;
const TRAINER_SPRITE_DIMENSIONS = 80;
const DEFAULT_TRAINER_SPRITES = ['lucas', 'dawn', 'ethan', 'lyra', 'hilbert', 'hilda', 'rosa', 'nate'] as TrainerSpriteId[];
const TEAM_PREVIEW_HIDDEN_FORMES: string[] = ['Arceus', 'Gourgeist', 'Genesect', 'Pumpkaboo', 'Silvally', 'Urshifu'];
const OM_OF_THE_MONTH = 'OM of the Month';
const ROA_SPOTLIGHT = 'RoA Spotlight';
const OM_OF_THE_MONTH_PREFIX = 'omotm';
const ROA_SPOTLIGHT_PREFIX = 'roas';

const mechanicsDifferences: Dict<string> = {
	'gen1': '3668073/post-8553244',
	'gen2': '3668073/post-8553245',
	'gen3': '3668073/post-8553246',
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
	'lc': 'LC',
	'cap': 'Cap',
	'caplc': 'Cap LC',
	'capnfe': 'Cap NFE',
	'ag': 'Anything Goes',
	'duber': 'DUber',
	'dou': 'DOU',
	'dbl': 'DBL',
	'duu': 'DUU',
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
	'Allow CAP': 'CAP',
	'Allow Tradeback': 'Tradeback',
	'Ignore Illegal Abilities': 'Almost Any Ability',
	'Hoenn Pokedex': 'Hoenn',
	'Sinnoh Pokedex': 'Sinnoh',
	'Old Unova Pokedex': 'Unova BW',
	'New Unova Pokedex': 'Unova BW2',
	'Kalos Pokedex': 'Kalos',
	'Old Alola Pokedex': 'Alola SuMo',
	'New Alola Pokedex': 'Alola USUM',
	'Galar Pokedex': 'Galar',
	'Isle of Armor Pokedex': 'Isle of Armor',
	'Crown Tundra Pokedex': 'Crown Tundra',
	'One vs One': '1v1',
	'Two vs Two': '2v2',
	'Little Cup': 'LC',
	'Not Fully Evolved': 'NFE',
	'Sleep Clause Mod': 'Sleep Clause',
	'Switch Priority Clause Mod': 'Switch Priority Clause',
	'Freeze Clause Mod': 'Freeze Clause',
	'350 Cup Mod': '350 Cup',
	'Flipped Mod': 'Flipped',
	'Scalemons Mod': 'Scalemons',
	'Tier Shift Mod': 'Tier Shift',
	'Alphabet Cup Move Legality': 'Alphabet Cup',
	'Sketchmons Move Legality': 'Sketchmons',
	'Chimera 1v1 Rule': 'Chimera 1v1',
	'Bonus Type Rule': 'Bonus Type',
	'First Blood Rule': 'First Blood',
	'Cross Evolution Mod': 'Cross Evolution',
	'Revelationmons Mod': 'Revelationmons',
};

const gen2Items: string[] = ['berserkgene', 'berry', 'bitterberry', 'burntberry', 'goldberry', 'iceberry', 'mintberry', 'miracleberry',
	'mysteryberry', 'pinkbow', 'polkadotbow', 'przcureberry', 'psncureberry'];

type CustomRuleFormats = Dict<{banlist: string, format: string}>;
const customRuleFormats: CustomRuleFormats = {
	oubl: {banlist: '+Uber', format: 'OU'},
	uubl: {banlist: '+UUBL', format: 'UU'},
	rubl: {banlist: '+RUBL', format: 'RU'},
	nubl: {banlist: '+NUBL', format: 'NU'},
	publ: {banlist: '+PUBL', format: 'PU'},
	doubl: {banlist: '+DUber', format: 'Doubles OU'},
	duubl: {banlist: '+DBL', format: 'Doubles UU'},
};

const nonClauseCustomRuleAliases: Dict<string> = {
	uber: "Uber",
	ou: "OU",
	uu: "UU",
	ru: "RU",
	nu: "NU",
	pu: "PU",
	zu: "ZU",
	nfe: "NFE",
	lc: "LC",
	oubl: "OUBL",
	uubl: "UUBL",
	rubl: "RUBL",
	nubl: "NUBL",
	publ: "PUBL",
	doubl: "DOUBL",
	duubl: "DUUBL",
	cap: "CAP",
	aaa: "AAA",
	inverse: "Inverse",
};

const customRuleAliases: Dict<string[]> = {
	uber: ['-All Pokemon', '+LC', '+NFE', '+ZU', '+PU', '+PUBL', '+NU', '+NUBL', '+RU', '+RUBL', '+UU', '+UUBL', '+OU', '+Uber'],
	ou: ['-All Pokemon', '+LC', '+NFE', '+ZU', '+PU', '+PUBL', '+NU', '+NUBL', '+RU', '+RUBL', '+UU', '+UUBL', '+OU'],
	uu: ['-All Pokemon', '+LC', '+NFE', '+ZU', '+PU', '+PUBL', '+NU', '+NUBL', '+RU', '+RUBL', '+UU'],
	ru: ['-All Pokemon', '+LC', '+NFE', '+ZU', '+PU', '+PUBL', '+NU', '+NUBL', '+RU'],
	nu: ['-All Pokemon', '+LC', '+NFE', '+ZU', '+PU', '+PUBL', '+NU'],
	pu: ['-All Pokemon', '+LC', '+NFE', '+ZU', '+PU'],
	zu: ['-All Pokemon', '+LC', '+NFE', '+ZU'],
	nfe: ['-All Pokemon', '+LC', '+NFE'],
	lc: ['-All Pokemon', '+LC'],
	oubl: ['+Uber'],
	uubl: ['+UUBL'],
	rubl: ['+RUBL'],
	nubl: ['+NUBL'],
	publ: ['+PUBL'],
	doubl: ['+DUber'],
	duubl: ['+DBL'],
	cap: ['+CAP', '+CAP NFE', '+CAP LC'],
	monotype: ['Same Type Clause'],
	stabmons: ['STABmons Move Legality'],
	camomons: ['[Gen 8] Camomons'],
	'350cup': ['350 Cup Mod'],
	flipped: ['Flipped Mod'],
	scalemons: ['Scalemons Mod'],
};

let customRuleAliasesByLength: string[] = [];

interface IInheritedFormatOptions {
	customRuleAlias: string;
	abilities?: boolean;
	items?: boolean;
	moves?: boolean;
	pokemon?: boolean;
}

const customRuleInheritedFormats: Dict<IInheritedFormatOptions> = {
	almostanyability: {
		customRuleAlias: 'aaa',
		abilities: true,
	},
	inverse: {
		customRuleAlias: 'inverse',
		pokemon: true,
	},
};

const customRuleInheritedFormatFallbacks: Dict<string[]> = {
	almostanyability: ['Ignore Illegal Abilities'],
	inverse: ['Inverse Mod'],
};

const omotms: string[] = [];
const roaSpotlights: string[] = [];

type Dexes = Dict<Dex>;
const dexes: Dexes = {};

type CharacterTypes = readonly CharacterType[];
const characterTypes: CharacterTypes = ['player', 'rival', 'gymleader', 'elitefour', 'champion', 'frontierbrain', 'professor',
	'antagonist', 'other'];

type CharacterTypeNames = Readonly<KeyedDict<CharacterType, string>>;
const characterTypeNames: CharacterTypeNames = {
	player: "Player",
	rival: "Rival",
	gymleader: "Gym Leader",
	elitefour: "Elite Four",
	champion: "Champion",
	frontierbrain: "Frontier Brain",
	professor: "Professor",
	antagonist: "Antagonist",
	other: "Misc.",
};

type LocationTypes = readonly LocationType[];
const locationTypes: LocationTypes = ['town', 'city', 'cave', 'forest', 'mountain', 'other'];

type LocationTypeNames = Readonly<KeyedDict<LocationType, string>>;
const locationTypeNames: LocationTypeNames = {
	city: "City",
	town: "Town",
	cave: "Cave",
	forest: "Forest",
	mountain: "Mountain",
	other: "Misc.",
};

type Regions = readonly RegionName[];
const regions: Regions = ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar'];

type RegionNames = Readonly<KeyedDict<RegionName, string>>;
const regionNames: RegionNames = {
	kanto: "Kanto",
	johto: "Johto",
	hoenn: "Hoenn",
	sinnoh: "Sinnoh",
	unova: "Unova",
	kalos: "Kalos",
	alola: "Alola",
	galar: "Galar",
};

export class Dex {
	private formatNamesByCustomRules: Dict<string> = {};

	private readonly clientDataDirectory: string;
	private readonly gen: number;
	private readonly isBase: boolean;
	private readonly pokemonShowdownDex: IPokemonShowdownDex;
	private readonly pokemonShowdownValidator: IPokemonShowdownValidator;

	/* eslint-disable @typescript-eslint/no-unsafe-assignment */
	private abilitiesList: readonly IAbility[] | null = null;
	private readonly abilityCache: Dict<IAbility> = Object.create(null);
	private readonly allPossibleMovesCache: Dict<string[]> = Object.create(null);
	private readonly dataCache: IDataTable | null = null;
	private readonly effectivenessCache: Dict<Dict<number>> = Object.create(null);
	private readonly evolutionLinesCache: Dict<string[][]> = Object.create(null);
	private readonly evolutionLinesFormesCache: Dict<Dict<string[][]>> = Object.create(null);
	private readonly immunityCache: Dict<Dict<boolean>> = Object.create(null);
	private readonly inverseResistancesCache: Dict<string[]> = Object.create(null);
	private readonly inverseWeaknessesCache: Dict<string[]> = Object.create(null);
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
	private readonly resistancesCache: Dict<string[]> = Object.create(null);
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

			// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
			this.pokemonShowdownValidator = require(path.join(Tools.pokemonShowdownFolder, simDist, "team-validator.js"))
				.TeamValidator as IPokemonShowdownValidator;
		} else {
			this.pokemonShowdownDex = pokemonShowdownDexBase.mod(mod);
			this.pokemonShowdownValidator = dexes['base'].pokemonShowdownValidator;
		}

		this.clientDataDirectory = path.join(Tools.rootFolder, 'client-data');
		this.gen = gen;
		this.isBase = isBase;
	}

	loadAllData(): void {
		for (const mod in dexes) {
			dexes[mod].loadData();
		}
	}

	getTeamPreviewHiddenFormes(): readonly string[] {
		return TEAM_PREVIEW_HIDDEN_FORMES;
	}

	getCharacterTypes(): CharacterTypes {
		return characterTypes;
	}

	getCharacterTypeNames(): CharacterTypeNames {
		return characterTypeNames;
	}

	getLocationTypes(): LocationTypes {
		return locationTypes;
	}

	getLocationTypeNames(): LocationTypeNames {
		return locationTypeNames;
	}

	getRegions(): Regions {
		return regions;
	}

	getRegionNames(): RegionNames {
		return regionNames;
	}

	getCurrentGenString(): string {
		return CURRENT_GEN_STRING;
	}

	getCustomRuleAliases(): Readonly<Dict<string[]>> {
		return customRuleAliases;
	}

	getCustomRuleFormats(): Readonly<CustomRuleFormats> {
		return customRuleFormats;
	}

	getDefaultCustomRulesName(): string {
		return DEFAULT_CUSTOM_RULES_NAME;
	}

	getTagNames(): Readonly<Dict<string>> {
		return tagNames;
	}

	getDexes(): Readonly<Dexes> {
		return dexes;
	}

	getTrainerSpriteDimensions(): number {
		return TRAINER_SPRITE_DIMENSIONS;
	}

	getGen(): number {
		return this.gen;
	}

	getDex(mod?: string): Dex {
		if (!mod) mod = CURRENT_GEN_STRING;
		return dexes[mod];
	}

	getData(): IDataTable {
		if (!this.dataCache) this.loadData();
		return this.dataCache!;
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

		const ability = this.pokemonShowdownDex.abilities.get(name);
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
		for (const i of this.getData().abilityKeys) {
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

		const item = this.pokemonShowdownDex.items.get(name);
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
		for (const i of this.getData().itemKeys) {
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

		const learnsetData = this.pokemonShowdownDex.species.getLearnsetData(id);
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

		let move = this.pokemonShowdownDex.moves.get(name);
		if (!move.exists) return undefined;

		if (move.realMove && Tools.toId(move.realMove) === 'hiddenpower') {
			move = Tools.deepClone(move);
			// @ts-expect-error
			move.id = Tools.toId(move.name);
		}

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
		for (const i of this.getData().moveKeys) {
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

		const pokemon = Tools.deepClone(this.pokemonShowdownDex.species.get(name));
		if (!pokemon.exists) return undefined;

		if (pokemon.forme && Tools.toId(pokemon.baseSpecies) === pokemon.spriteid) {
			pokemon.spriteid += '-' + Tools.toId(pokemon.forme);
		}

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
		for (const i of this.getData().pokemonKeys) {
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
		return this.getData().categories[pokemon.id] || '';
	}

	getFormes(pokemon: IPokemon): string[] {
		if (Object.prototype.hasOwnProperty.call(this.formesCache, pokemon.name)) return this.formesCache[pokemon.name];

		const baseSpecies = this.getExistingPokemon(pokemon.baseSpecies);
		const formes: string[] = [baseSpecies.name];

		if (baseSpecies.otherFormes) {
			for (const otherForme of baseSpecies.otherFormes) {
				formes.push(this.getExistingPokemon(otherForme).name);
			}
		}

		if (baseSpecies.cosmeticFormes) {
			for (const cosmeticForme of baseSpecies.cosmeticFormes) {
				formes.push(this.getExistingPokemon(cosmeticForme).name);
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

		const type = this.pokemonShowdownDex.types.get(name);
		if (!type.exists) return undefined;

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

		const nature = this.pokemonShowdownDex.natures.get(name);
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
		for (const region of regions) {
			for (const badge of this.getData().badges[region]) {
				if (!badges.includes(badge)) badges.push(badge);
			}
		}

		return badges;
	}

	getCharacters(): string[] {
		const charactersData = this.getData().characters;
		const characters: string[] = [];
		for (const region of regions) {
			const types = Object.keys(charactersData[region]) as CharacterType[];
			for (const type of types) {
				for (const character of charactersData[region][type]) {
					if (!characters.includes(character)) characters.push(character);
				}
			}
		}

		return characters;
	}

	getLocations(): string[] {
		const locationsData = this.getData().locations;
		const locations: string[] = [];
		for (const region of regions) {
			const types = Object.keys(locationsData[region]) as LocationType[];
			for (const type of types) {
				for (const location of locationsData[region][type]) {
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
			targetType = targetType as readonly string[];
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
			targetType = targetType as readonly string[];
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

	/**
	 * Returns >=1 if super-effective, <=1 if not very effective
	 */
	getInverseEffectiveness(source: IMove | string, target: IPokemon | string | readonly string[]): number {
		if (this.isImmune(source, target)) return 1;
		return this.getEffectiveness(source, target) * -1;
	}

	getWeaknesses(pokemon: IPokemon): readonly string[] {
		const cacheKey = pokemon.types.slice().sort().join(',');
		if (Object.prototype.hasOwnProperty.call(this.weaknessesCache, cacheKey)) return this.weaknessesCache[cacheKey];

		const weaknesses: string[] = [];
		for (const key of this.getData().typeKeys) {
			const type = this.getExistingType(key);
			if (this.isImmune(type.name, pokemon)) continue;
			if (this.getEffectiveness(type.name, pokemon) >= 1) weaknesses.push(type.name);
		}

		this.weaknessesCache[cacheKey] = weaknesses;
		return weaknesses;
	}

	getInverseWeaknesses(pokemon: IPokemon): readonly string[] {
		const cacheKey = pokemon.types.slice().sort().join(',');
		if (Object.prototype.hasOwnProperty.call(this.inverseWeaknessesCache, cacheKey)) return this.inverseWeaknessesCache[cacheKey];

		const inverseWeaknesses: string[] = [];
		for (const key of this.getData().typeKeys) {
			const type = this.getExistingType(key);
			if (this.getInverseEffectiveness(type.name, pokemon) >= 1) inverseWeaknesses.push(type.name);
		}

		this.inverseWeaknessesCache[cacheKey] = inverseWeaknesses;
		return inverseWeaknesses;
	}

	getResistances(pokemon: IPokemon): readonly string[] {
		const cacheKey = pokemon.types.slice().sort().join(',');
		if (Object.prototype.hasOwnProperty.call(this.resistancesCache, cacheKey)) return this.resistancesCache[cacheKey];

		const resistances: string[] = [];
		for (const key of this.getData().typeKeys) {
			const type = this.getExistingType(key);
			if (this.isImmune(type.name, pokemon)) continue;
			if (this.getEffectiveness(type.name, pokemon) <= -1) resistances.push(type.name);
		}

		this.resistancesCache[cacheKey] = resistances;
		return resistances;
	}

	getInverseResistances(pokemon: IPokemon): readonly string[] {
		const cacheKey = pokemon.types.slice().sort().join(',');
		if (Object.prototype.hasOwnProperty.call(this.inverseResistancesCache, cacheKey)) return this.inverseResistancesCache[cacheKey];

		const inverseResistances: string[] = [];
		for (const key of this.getData().typeKeys) {
			const type = this.getExistingType(key);
			if (this.getInverseEffectiveness(type.name, pokemon) <= -1) inverseResistances.push(type.name);
		}

		this.inverseResistancesCache[cacheKey] = inverseResistances;
		return inverseResistances;
	}

	getModelData(pokemon: IPokemon, generation?: ModelGeneration, direction?: 'front' | 'back'): IGifDirectionData | undefined {
		if (!generation) generation = 'xy';
		let oldGen = false;
		if (generation === 'rb') {
			if (pokemon.gen > 1) return undefined;
			oldGen = true;
		} else if (generation === 'gs') {
			if (pokemon.gen > 2) return undefined;
			oldGen = true;
		} else if (generation === 'rs') {
			if (pokemon.gen > 3) return undefined;
			oldGen = true;
		} else if (generation === 'dp') {
			if (pokemon.gen > 4) return undefined;
			oldGen = true;
		}

		if (oldGen) {
			return {
				h: 96,
				w: 96,
			};
		}

		if (!direction) direction = 'front';
		if (generation === 'bw') {
			if (pokemon.gen > 5) return undefined;

			const gifDataBW = this.getData().gifDataBW;
			if (Object.prototype.hasOwnProperty.call(gifDataBW, pokemon.id) && gifDataBW[pokemon.id]![direction]) {
				return gifDataBW[pokemon.id]![direction];
			}
		} else {
			const gifData = this.getData().gifData;
			if (Object.prototype.hasOwnProperty.call(gifData, pokemon.id) && gifData[pokemon.id]![direction]) {
				return gifData[pokemon.id]![direction];
			}
		}
		return undefined;
	}

	getModelGenerationName(generation: number): ModelGeneration {
		if (generation === 1) return 'rb';
		if (generation === 2) return 'gs';
		if (generation === 3) return 'rs';
		if (generation === 4) return 'dp';
		if (generation === 5) return 'bw';
		return 'xy';
	}

	getModelGenerations(): readonly ModelGeneration[] {
		return ['rb', 'gs', 'rs', 'dp', 'bw', 'xy'];
	}

	getModelGenerationMaxGen(generation: ModelGeneration): number {
		if (generation === 'rb') return 1;
		if (generation === 'gs') return 2;
		if (generation === 'rs') return 3;
		if (generation === 'dp') return 4;
		if (generation === 'bw') return 5;
		return dexes.base.gen;
	}

	hasModelData(pokemon: IPokemon, generation?: ModelGeneration, direction?: 'front' | 'back'): boolean {
		return !!this.getModelData(pokemon, generation, direction);
	}

	getPlaceholderSprite(): string {
		return '<img src="//' + Tools.mainServer + '/sprites/gen5/0.png" width="96" height="96" />';
	}

	getPokemonModel(pokemon: IPokemon, generation?: ModelGeneration, direction?: 'front' | 'back', shiny?: boolean): string {
		if (!generation) generation = 'xy';

		const bw = generation === 'bw';
		const xy = generation === 'xy';

		let prefix = '//' + Tools.mainServer + '/sprites/';
		let suffix = '.png';
		if (generation === 'rb') {
			prefix += 'gen1';
		} else if (generation === 'gs') {
			prefix += 'gen2';
		} else if (generation === 'rs') {
			prefix += 'gen3';
		} else if (generation === 'dp') {
			prefix += 'gen4';
		} else {
			prefix += (bw ? 'gen5' : '') + 'ani';
			suffix = '.gif';
		}

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

		let pokemonGifData: IGifData | undefined;
		if (bw) {
			const gifDataBW = this.getData().gifDataBW;
			if (Object.prototype.hasOwnProperty.call(gifDataBW, pokemon.id)) pokemonGifData = gifDataBW[pokemon.id];
		} else if (xy) {
			if (Config.afd) {
				prefix = '//' + Tools.mainServer + '/sprites/afd';
				suffix = '.png';
				if (shiny) {
					prefix += '-shiny';
				}
			} else {
				const gifData = this.getData().gifData;
				if (Object.prototype.hasOwnProperty.call(gifData, pokemon.id)) pokemonGifData = gifData[pokemon.id];
			}
		}

		let width: number;
		let height: number;
		if (pokemonGifData && pokemonGifData[direction]) {
			width = pokemonGifData[direction]!.w;
			height = pokemonGifData[direction]!.h;
		} else {
			width = 96;
			height = 96;
		}

		return '<img src="' + prefix + '/' + pokemon.spriteid + suffix + '" width="' + width + '" height="' + height + '" />';
	}

	getPokemonIcon(pokemon: IPokemon, facingLeft?: boolean): string {
		let num = pokemon.num;
		if (num < 0) {
			num = 0;
		} else if (num > 898) {
			num = 0;
		}

		const alternateIconNumbers = this.getData().alternateIconNumbers;
		if (facingLeft) {
			if (alternateIconNumbers.left[pokemon.id]) num = alternateIconNumbers.left[pokemon.id]!;
		} else if (pokemon.gender === 'F') {
			if (pokemon.id === 'unfezant' || pokemon.id === 'frillish' || pokemon.id === 'jellicent' || pokemon.id === 'meowstic' ||
				pokemon.id === 'pyroar') {
				num = alternateIconNumbers.right[pokemon.id + 'f']!;
			}
		} else {
			if (alternateIconNumbers.right[pokemon.id]) num = alternateIconNumbers.right[pokemon.id]!;
		}

		const top = Math.floor(num / 12) * POKEMON_ICON_HEIGHT;
		const left = (num % 12) * POKEMON_ICON_WIDTH;
		const facingLeftStyle = facingLeft ? "transform:scaleX(-1);webkit-transform:scaleX(-1);" : "";
		return '<span style="display: inline-block;height: ' + POKEMON_ICON_HEIGHT + 'px;width: ' + POKEMON_ICON_WIDTH + 'px;' +
			'image-rendering: pixelated;' +
			'background:transparent url(https://' + Tools.mainServer + '/sprites/pokemonicons-sheet.png?v6) no-repeat scroll -' + left +
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

	getMoveCategoryIcon(move: IMove): string {
		return '<img src="//' + Tools.mainServer + '/sprites/categories/' + move.category + '.png" width="32" height="14" />';
	}

	getTrainerSpriteId(name: string): string | undefined {
		const trainerSprites = this.getData().trainerSprites;
		const id = Tools.toId(name);
		if (Object.prototype.hasOwnProperty.call(trainerSprites, id)) return trainerSprites[id];

		for (let i = this.gen; i > 0; i--) {
			const oldGenId = id + 'gen' + i;
			if (Object.prototype.hasOwnProperty.call(trainerSprites, oldGenId)) return trainerSprites[oldGenId];
		}
	}

	getRandomDefaultTrainerSpriteId(): string {
		return Tools.sampleOne(DEFAULT_TRAINER_SPRITES);
	}

	getTrainerSprite(id: string): string {
		return '<img src="//' + Tools.mainServer + '/sprites/trainers/' + id + '.png" width=' + TRAINER_SPRITE_DIMENSIONS + 'px ' +
			'height=' + TRAINER_SPRITE_DIMENSIONS + 'px />';
	}

	getTypeHtml(type: ITypeData, width?: number): string {
		return Tools.getHexLabel(Tools.getTypeHexCode(type.name)!, type.name, width);
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

	joinNameAndCustomRules(format: string | IFormat, customRules: string[] | null): string {
		let compatibleRules: string[] = [];
		if (customRules) {
			if (typeof format !== 'string' && format.team && !format.id.includes('hackmonscup')) {
				for (const rule of customRules) {
					const type = rule.charAt(0);
					if (type !== '-' && type !== '+' && type !== '*') compatibleRules.push(rule);
				}
			} else {
				compatibleRules = customRules;
			}
		}

		return (typeof format === 'string' ? format : format.name) + (compatibleRules.length ? "@@@" + compatibleRules.join(',') : "");
	}

	resolveCustomRuleAliases(customRules: string[]): string[] {
		const uniqueCustomRules: string[] = [];
		for (const rule of customRules) {
			const id = Tools.toId(rule);
			if (id in customRuleAliases) {
				for (const aliasRule of customRuleAliases[id]) {
					const trimmed = aliasRule.trim();
					if (!uniqueCustomRules.includes(trimmed)) uniqueCustomRules.push(trimmed);
				}
			} else {
				const trimmed = rule.trim();
				if (!uniqueCustomRules.includes(trimmed)) uniqueCustomRules.push(trimmed);
			}
		}

		return uniqueCustomRules;
	}

	getFormat(name: string, isValidated?: boolean): IFormat | undefined {
		let formatId = Tools.toId(name);
		if (!formatId) return;

		name = name.trim();
		const inputTarget = name;

		const split = this.splitNameAndCustomRules(name);
		let allCustomRules = this.resolveCustomRuleAliases(split[1]);
		name = this.joinNameAndCustomRules(split[0], allCustomRules);

		let format = this.pokemonShowdownDex.formats.get(name, isValidated);
		if (!format.exists) {
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
			} else {
				if (formatId.startsWith(OM_OF_THE_MONTH_PREFIX)) {
					const index = parseInt(formatId.substr(OM_OF_THE_MONTH_PREFIX.length) || '1');
					if (!isNaN(index)) {
						const omotm = omotms[index - 1];
						if (omotm) name = omotm;
					}
				} else if (formatId.startsWith(ROA_SPOTLIGHT_PREFIX)) {
					const index = parseInt(formatId.substr(ROA_SPOTLIGHT_PREFIX.length) || '1');
					if (!isNaN(index)) {
						const roas = roaSpotlights[index - 1];
						if (roas) name = roas;
					}
				}
			}

			let baseFormat = this.pokemonShowdownDex.formats.get(name);
			if (!baseFormat.exists) {
				for (let i = CURRENT_GEN - 1; i >= 1; i--) {
					baseFormat = this.pokemonShowdownDex.formats.get('gen' + i + name);
					if (baseFormat.exists) break;
				}
			}

			if (baseFormat.exists) {
				allCustomRules = this.resolveCustomRuleAliases(allCustomRules);
				name = this.joinNameAndCustomRules(baseFormat, allCustomRules);
				format = this.pokemonShowdownDex.formats.get(name, isValidated);
			}
		}

		if (!format.exists) return undefined;

		// standard formats are cached in PS
		if (!format.customRules) {
			delete format.ruleTable;
			format = Tools.deepClone(format);
		}

		format.inputTarget = inputTarget;

		if (!format.gen && format.mod.startsWith('gen')) {
			const possibleGen = format.mod.substr(3);
			if (Tools.isInteger(possibleGen)) format.gen = parseInt(possibleGen);
		}

		if (format.name.startsWith("[")) {
			const bracketIndex = format.name.indexOf("]");
			format.nameWithoutGen = format.name.substr(bracketIndex + 1).trim();
		} else {
			format.nameWithoutGen = format.name;
		}

		if (!format.ruleTable) format.ruleTable = this.pokemonShowdownDex.formats.getRuleTable(format);
		format.quickFormat = format.ruleTable.pickedTeamSize && format.ruleTable.pickedTeamSize <= 2 ? true : false;

		format.tournamentPlayable = !!(format.searchShow || format.challengeShow || format.tournamentShow);
		format.unranked = format.rated === false || format.id.includes('customgame') || format.id.includes('hackmonscup') ||
			format.id.includes('challengecup') || format.id.includes('metronomebattle') ||
			(format.team && (format.id.includes('1v1') || format.id.includes('monotype'))) || format.mod === 'seasonal' ||
			format.mod === 'ssb' ? true : false;

		let info: IParsedSmogonLink | undefined;
		let teams: IParsedSmogonLink | undefined;
		let viability: IParsedSmogonLink | undefined;

		const idWithoutGen = format.name.includes("[Gen ") ? Tools.toId(format.name.substr(format.name.indexOf(']') + 1)) : format.id;
		if (format.threads) {
			const threads = format.threads.slice();
			for (const thread of threads) {
				const parsedThread = Tools.parseSmogonLink(thread);
				if (!parsedThread) continue;
				if (parsedThread.description.includes('Viability Rankings')) {
					viability = parsedThread;
				} else if (parsedThread.description.includes('Sample Teams')) {
					teams = parsedThread;
				} else if (Tools.toId(parsedThread.description) === idWithoutGen) {
					info = parsedThread;
				}
			}
		}

		if (format.id in formatLinks) {
			const links = formatLinks[format.id]!;
			if (links.info) {
				format['info-official'] = info;
				format.info = links.info;
			} else {
				format.info = info ? info.link : undefined;
			}

			if (links.teams) {
				format['teams-official'] = teams;
				format.teams = links.teams;
			} else {
				format.teams = teams ? teams.link : undefined;
			}

			if (links.viability) {
				format['viability-official'] = viability;
				format.viability = links.viability;
			} else {
				format.viability = viability ? viability.link : undefined;
			}

			if (links.ruinsOfAlphTeams) format.ruinsOfAlphTeams = links.ruinsOfAlphTeams;
		} else {
			format.info = info ? info.link : undefined;
			format.teams = teams ? teams.link : undefined;
			format.viability = viability ? viability.link : undefined;
		}

		if (format.teams && format.ruinsOfAlphTeams && format.teams === format.ruinsOfAlphTeams) format.teams = undefined;

		const links = ['info', 'roleCompendium', 'teams', 'viability'] as const;
		for (const id of links) {
			if (format[id]) {
				// @ts-expect-error
				const officialLink = format[id + '-official'] as IParsedSmogonLink | undefined;
				if (!officialLink) continue;

				const storedLink = Tools.parseSmogonLink(format[id]!);
				if (!storedLink || storedLink.dexPage) continue;

				if (officialLink.dexPage) {
					format[id] = officialLink.link;
				} else if (officialLink.threadId && storedLink.threadId) {
					format[id] = Tools.getNewerForumLink(storedLink, officialLink).link;
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

	getFormatInfoDisplay(format: IFormat, tournamentRoom?: string): string {
		let info = format.desc || '';

		if (format.info) {
			if (format.desc) {
				info += ' More info ';
			} else {
				info += 'Description and more info ';
			}

			if (format.info.startsWith(Tools.smogonDexPrefix)) {
				info += 'on the <a href="' + format.info + '">dex page</a>';
			} else {
				info += 'in the <a href="' + format.info + '">discussion thread</a>';
			}
		}

		const links: string[] = [];
		if (format.mod in mechanicsDifferences) {
			links.push('&bull;&nbsp;<a href="' + Tools.smogonThreadsPrefix + mechanicsDifferences[format.mod] + '">Gen ' + format.gen +
				' mechanics differences</a>');
		}

		if (format.teams) {
			links.push('&bull;&nbsp;<a href="' + format.teams + '">Sample teams</a>');
		}

		if (format.ruinsOfAlphTeams) {
			links.push('&bull;&nbsp;<a href="' + format.ruinsOfAlphTeams + '">Ruins of Alph team hub</a>');
		}

		if (format.viability) {
			links.push('&bull;&nbsp;<a href="' + format.viability + '">Viability rankings</a>');
		}

		if (format.roleCompendium) {
			links.push('&bull;&nbsp;<a href="' + format.roleCompendium + '">Role compendium</a>');
		}

		if (tournamentRoom && Config.tournamentRules && tournamentRoom in Config.tournamentRules) {
			links.push('<br />Please follow the <b><a href="' + Config.tournamentRules[tournamentRoom] + '">tournament rules</a></b>!');
		}

		if (!info && !links.length) return "";
		return "<b>" + format.name + "</b>&nbsp;&bull;&nbsp;" + format.gameType + "&nbsp;&bull;&nbsp;" +
			(format.team ? "random team provided" : "bring your own team") + (info ? "<br />" + info : "") +
			(links.length ? "<br /><br />" + links.join("<br />") : "");
	}

	getRuleTable(format: IFormat): RuleTable {
		if (!format.ruleTable) format.ruleTable = this.pokemonShowdownDex.formats.getRuleTable(format);
		return format.ruleTable;
	}

	/**
	 * Returns a sanitized format ID if valid, or throws if invalid.
	 */
	validateFormat(name: string): string {
		return this.pokemonShowdownDex.formats.validate(name);
	}

	/**
	 * Validates a custom rule (throws if invalid).
	 */
	validateRule(rule: string): ValidatedRule {
		return this.pokemonShowdownDex.formats.validateRule(rule);
	}

	getValidatedRuleName(input: string): string {
		if (input === 'unreleased') return 'Unreleased';
		if (input === 'illegal') return 'Illegal';
		if (input === 'nonexistent') return 'Non-existent';
		const type = input.charAt(0);
		if (type === '+' || type === '-' || type === '*' || type === '!') {
			input = input.substr(1);
		}

		const [rule, value] = input.split('=');
		let ruleName = rule.trim();

		const index = ruleName.indexOf(':');
		let tag = "";
		if (index !== -1) {
			tag = ruleName.substr(0, index);
			ruleName = ruleName.substr(index + 1);
		}

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

		return ruleName + (value ? " = " + value.trim() : "");
	}

	getUsablePokemon(format: IFormat): string[] {
		if (format.usablePokemon) return format.usablePokemon;

		const formatid = this.joinNameAndCustomRules(format, format.customRules);
		const validator = new this.pokemonShowdownValidator(formatid, dexes['base'].pokemonShowdownDex);
		const ruleTable = this.getRuleTable(format);

		const usableAbilities = this.getUsableAbilities(format);
		const usableItems = this.getUsableItems(format);
		const usableMoves = this.getUsableMoves(format);

		const formatDex = format.mod in dexes ? dexes[format.mod] : this;
		const littleCup = ruleTable.has("littlecup");
		const usablePokemon: string[] = [];
		for (const i of formatDex.getData().pokemonKeys) {
			const formes = formatDex.getFormes(formatDex.getExistingPokemon(i));
			for (const forme of formes) {
				// use PS tier in isBannedSpecies()
				const pokemon = formatDex.pokemonShowdownDex.species.get(forme);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const set: Dict<any> = {};

				if (pokemon.requiredAbility) {
					if (!usableAbilities.includes(pokemon.requiredAbility)) continue;
					set.ability = pokemon.requiredAbility;
				}

				if (pokemon.requiredItem) {
					if (!usableItems.includes(pokemon.requiredItem)) continue;
					set.item = pokemon.requiredItem;
				}

				if (pokemon.requiredItems) {
					let usableItem = "";
					for (const item of pokemon.requiredItems) {
						if (usableItems.includes(item)) {
							usableItem = item;
							break;
						}
					}

					if (!usableItem) continue;
					set.item = usableItem;
				}

				if (pokemon.requiredMove) {
					if (!usableMoves.includes(pokemon.requiredMove)) continue;
					set.moves = [pokemon.requiredMove];
				}

				if (validator.checkSpecies(set, pokemon, pokemon, {})) continue;

				if (littleCup && !(pokemon.tier === 'LC' || formatDex.isPseudoLCPokemon(pokemon))) continue;

				usablePokemon.push(pokemon.name);
			}
		}

		format.usablePokemon = usablePokemon;
		return usablePokemon;
	}

	getUsableAbilities(format: IFormat): string[] {
		if (format.usableAbilities) return format.usableAbilities;

		const formatid = this.joinNameAndCustomRules(format, format.customRules);
		const validator = new this.pokemonShowdownValidator(formatid, dexes['base'].pokemonShowdownDex);

		const formatDex = format.mod in dexes ? dexes[format.mod] : this;
		const usableAbilities: string[] = [];
		for (const i of formatDex.getData().abilityKeys) {
			// PS move.id compatibility
			const ability = formatDex.pokemonShowdownDex.abilities.get(i);
			if (!validator.checkAbility({}, ability, {})) {
				usableAbilities.push(ability.name);
			}
		}

		format.usableAbilities = usableAbilities;
		return usableAbilities;
	}

	getUsableItems(format: IFormat): string[] {
		if (format.usableItems) return format.usableItems;

		const formatid = this.joinNameAndCustomRules(format, format.customRules);
		const validator = new this.pokemonShowdownValidator(formatid, dexes['base'].pokemonShowdownDex);

		const formatDex = format.mod in dexes ? dexes[format.mod] : this;
		const usableItems: string[] = [];
		for (const i of formatDex.getData().itemKeys) {
			// PS move.id compatibility
			const item = formatDex.pokemonShowdownDex.items.get(i);
			if (!validator.checkItem({}, item, {})) {
				usableItems.push(item.name);
			}
		}

		format.usableItems = usableItems;
		return usableItems;
	}

	getUsableMoves(format: IFormat): string[] {
		if (format.usableMoves) return format.usableMoves;

		const formatid = this.joinNameAndCustomRules(format, format.customRules);
		const validator = new this.pokemonShowdownValidator(formatid, dexes['base'].pokemonShowdownDex);

		const formatDex = format.mod in dexes ? dexes[format.mod] : this;
		const usableMoves: string[] = [];
		for (const i of formatDex.getData().moveKeys) {
			// PS move.id compatibility
			const move = formatDex.pokemonShowdownDex.moves.get(i);
			if (!validator.checkMove({}, move, {})) {
				usableMoves.push(move.name);
			}
		}

		format.usableMoves = usableMoves;
		return usableMoves;
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
			const rule = this.validateRule(ruleString);
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

	checkValidatedRuleInTable(ruleTable: RuleTable, validatedRule: ValidatedRule): boolean {
		if (typeof validatedRule === 'string') {
			return ruleTable.has(validatedRule);
		} else {
			if (validatedRule[0] === 'complexBan') {
				return ruleTable.getComplexBanIndex(ruleTable.complexBans, validatedRule[1]) !== -1;
			} else {
				return ruleTable.getComplexBanIndex(ruleTable.complexTeamBans, validatedRule[1]) !== -1;
			}
		}
	}

	formatContainsRuleSubset(format: IFormat, baseSeparatedRules: ISeparatedCustomRules,
		subsetSeparatedRules: ISeparatedCustomRules): boolean {
		const ruleTable = this.getRuleTable(format);

		for (const ban of subsetSeparatedRules.addedbans) {
			if (!baseSeparatedRules.addedbans.includes(ban) &&
				!this.checkValidatedRuleInTable(ruleTable, this.validateRule('-' + ban))) return false;
		}

		for (const ban of subsetSeparatedRules.removedbans) {
			if (!baseSeparatedRules.removedbans.includes(ban) &&
				!this.checkValidatedRuleInTable(ruleTable, this.validateRule('+' + ban))) return false;
		}

		for (const restriction of subsetSeparatedRules.addedrestrictions) {
			if (!baseSeparatedRules.addedrestrictions.includes(restriction) &&
				!this.checkValidatedRuleInTable(ruleTable, this.validateRule('*' + restriction))) return false;
		}

		for (const rule of subsetSeparatedRules.addedrules) {
			if (!baseSeparatedRules.addedrules.includes(rule) &&
				!this.checkValidatedRuleInTable(ruleTable, this.validateRule(rule))) return false;
		}

		for (const rule of subsetSeparatedRules.removedrules) {
			if (!baseSeparatedRules.removedrules.includes(rule) &&
				!this.checkValidatedRuleInTable(ruleTable, this.validateRule('!' + rule))) return false;
		}

		return true;
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

		const addedBans = format.separatedCustomRules.addedbans.slice();
		const removedBans = format.separatedCustomRules.removedbans.slice();
		const addedRestrictions = format.separatedCustomRules.addedrestrictions.slice();
		const addedRules = format.separatedCustomRules.addedrules.slice();
		const removedRules = format.separatedCustomRules.removedrules.slice();

		const baseFormat = this.getExistingFormat(format.name);
		for (const id of customRuleAliasesByLength) {
			if (!(id in nonClauseCustomRuleAliases)) continue;

			const aliasRuleset = customRuleAliases[id];
			const separatedAliasRules = this.separateCustomRules(aliasRuleset);
			if (!this.formatContainsRuleSubset(baseFormat, {
				addedbans: addedBans,
				removedbans: removedBans,
				addedrestrictions: addedRestrictions,
				addedrules: addedRules,
				removedrules: removedRules,
			}, separatedAliasRules)) continue;

			for (const ban of separatedAliasRules.addedbans) {
				const index = addedBans.indexOf(ban);
				if (index !== -1) addedBans.splice(index, 1);
			}

			for (const ban of separatedAliasRules.removedbans) {
				const index = removedBans.indexOf(ban);
				if (index !== -1) removedBans.splice(index, 1);
			}

			for (const restriction of separatedAliasRules.addedrestrictions) {
				const index = addedRestrictions.indexOf(restriction);
				if (index !== -1) addedRestrictions.splice(index, 1);
			}

			for (const rule of separatedAliasRules.addedrules) {
				const index = addedRules.indexOf(rule);
				if (index !== -1) addedRules.splice(index, 1);
			}

			for (const rule of separatedAliasRules.removedrules) {
				const index = removedRules.indexOf(rule);
				if (index !== -1) removedRules.splice(index, 1);
			}

			prefixesAdded.push(nonClauseCustomRuleAliases[id]);
		}

		let onlySuffix = false;
		if (addedBans.length && removedBans.length && !addedRestrictions.length) {
			if (addedBans.includes(tagNames.allabilities) && !addedBans.map(x => this.getAbility(x)).filter(x => !!x).length) {
				const abilities = format.separatedCustomRules.removedbans.map(x => this.getAbility(x)).filter(x => !!x);
				if (abilities.length === removedBans.length) {
					onlySuffix = true;
					addedBans.splice(addedBans.indexOf(tagNames.allabilities), 1);
					suffixes.push("Only " + Tools.joinList(abilities.map(x => x!.name)));
				}
			} else if (addedBans.includes(tagNames.allitems) && !addedBans.map(x => this.getItem(x)).filter(x => !!x).length) {
				const items = format.separatedCustomRules.removedbans.map(x => this.getItem(x)).filter(x => !!x);
				if (items.length === removedBans.length) {
					onlySuffix = true;
					addedBans.splice(addedBans.indexOf(tagNames.allitems), 1);
					suffixes.push("Only " + Tools.joinList(items.map(x => x!.name)));
				}
			} else if (addedBans.includes(tagNames.allmoves) && !addedBans.map(x => this.getMove(x)).filter(x => !!x).length) {
				const moves = format.separatedCustomRules.removedbans.map(x => this.getMove(x)).filter(x => !!x);
				if (moves.length === removedBans.length) {
					onlySuffix = true;
					addedBans.splice(addedBans.indexOf(tagNames.allmoves), 1);
					suffixes.push("Only " + Tools.joinList(moves.map(x => x!.name)));
				}
			} else if (addedBans.includes(tagNames.allpokemon) && !addedBans.map(x => this.getPokemon(x)).filter(x => !!x).length) {
				const pokemon = format.separatedCustomRules.removedbans.map(x => this.getPokemon(x)).filter(x => !!x);
				if (pokemon.length === removedBans.length) {
					onlySuffix = true;
					addedBans.splice(addedBans.indexOf(tagNames.allpokemon), 1);
					suffixes.push("Only " + Tools.joinList(pokemon.map(x => x!.name)));
				}
			}
		}

		if (addedBans.length) {
			prefixesRemoved = prefixesRemoved.concat(addedBans);
		}

		if (removedBans.length && !onlySuffix) {
			suffixes = suffixes.concat(removedBans);
		}

		if (addedRestrictions.length) {
			suffixes = suffixes.concat(addedRestrictions);
		}

		if (addedRules.length) {
			for (const addedRule of addedRules) {
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

		if (removedRules.length) {
			prefixesRemoved = prefixesRemoved.concat(removedRules.map(x => clauseNicknames[x] || x));
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

		if (options.speciesClause) {
			const uniqueSpeciesTeams: string[][] = [];
			outer:
			for (const teamAfterEvolutions of teamsAfterEvolutions) {
				const includedSpecies: string[] = [];
				for (const pokemon of teamAfterEvolutions) {
					const baseSpecies = this.getExistingPokemon(pokemon).baseSpecies;
					if (includedSpecies.includes(baseSpecies)) continue outer;
					includedSpecies.push(baseSpecies);
				}

				uniqueSpeciesTeams.push(teamAfterEvolutions);
			}

			teamsAfterEvolutions = uniqueSpeciesTeams;
		}

		for (const teamAfterEvolutions of teamsAfterEvolutions) {
			teamAfterEvolutions.sort();
		}

		teamsAfterEvolutions.sort((a, b) => a.length - b.length);

		return teamsAfterEvolutions;
	}

	includesPokemon(team: string[], requiredPokemon: readonly string[]): boolean {
		for (const pokemon of requiredPokemon) {
			if (!team.includes(this.getExistingPokemon(pokemon).name)) {
				return false;
			}
		}

		return true;
	}

	includesPokemonFormes(team: string[], requiredPokemonFormes: readonly string[][]): boolean {
		for (const requiredPokemon of requiredPokemonFormes) {
			if (this.includesPokemon(team, requiredPokemon)) return true;
		}

		return false;
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

	getClosestPossibleTeam(team: IPokemon[] | string[], possibleTeams: DeepImmutable<string[][]>,
		options: IGetPossibleTeamsOptions): IClosestPossibleTeam {
		const teamEvolutionLines: Dict<readonly string[][]> = {};
		const names: string[] = [];
		for (const slot of team) {
			const pokemon = typeof slot === 'string' ? this.getExistingPokemon(slot) : slot;
			const evolutionLines = this.getEvolutionLines(pokemon, options.allowFormes ? this.getFormes(pokemon) : undefined);
			const filteredEvolutionLines: string[][] = [];
			for (const evolutionLine of evolutionLines) {
				if (evolutionLine.includes(pokemon.name)) filteredEvolutionLines.push(evolutionLine);
			}
			teamEvolutionLines[pokemon.name] = filteredEvolutionLines;

			names.push(pokemon.name);
		}

		const teamLength = team.length;
		const expectedEvolution = options.evolutions && options.evolutions > 0;
		const validatedPossibleTeams = new Map<DeepImmutableArray<string>, IClosestPossibleTeam>();
		for (const possibleTeam of possibleTeams) {
			const incorrectPokemon: string[] = [];
			const invalidChoices: string[] = [];
			const extraEvolution: Dict<number> = {};
			const missingEvolution: Dict<number> = {};
			const extraDevolution: Dict<number> = {};
			const missingDevolution: Dict<number> = {};

			for (const name of names) {
				if (!possibleTeam.includes(name)) {
					incorrectPokemon.push(name);

					let semiValidChoice = false;
					for (const evolutionLine of teamEvolutionLines[name]) {
						for (const evolution of evolutionLine) {
							if (possibleTeam.includes(evolution)) {
								const stagesBetween = evolutionLine.indexOf(name) - evolutionLine.indexOf(evolution);
								if (expectedEvolution) {
									if (stagesBetween > 0) {
										extraEvolution[name] = stagesBetween;
									} else {
										missingEvolution[name] = stagesBetween * -1;
									}
								} else {
									if (stagesBetween > 0) {
										missingDevolution[name] = stagesBetween;
									} else {
										extraDevolution[name] = stagesBetween * -1;
									}
								}

								semiValidChoice = true;
								break;
							}
						}

						if (semiValidChoice) break;
					}

					if (!semiValidChoice) invalidChoices.push(name);
				}
			}

			validatedPossibleTeams.set(possibleTeam, {
				incorrectSize: possibleTeam.length - teamLength,
				incorrectPokemon,
				invalidChoices,
				extraEvolution,
				missingEvolution,
				extraDevolution,
				missingDevolution,
			});
		}

		let closestTeams: DeepImmutableArray<string>[] = [];
		let leastIncorrect = teamLength;

		validatedPossibleTeams.forEach((validation, possibleTeam) => {
			const incorrect = validation.incorrectPokemon.length;
			if (incorrect < leastIncorrect) {
				closestTeams = [possibleTeam];
				leastIncorrect = incorrect;
			} else if (incorrect === leastIncorrect) {
				closestTeams.push(possibleTeam);
			}
		});

		for (const closestTeam of closestTeams) {
			const validation = validatedPossibleTeams.get(closestTeam)!;
			if (validation.incorrectSize) continue;

			if (Object.keys(validation.extraEvolution).length || Object.keys(validation.missingEvolution).length ||
				Object.keys(validation.extraDevolution).length || Object.keys(validation.missingDevolution).length) {
				return validation;
			}
		}

		return validatedPossibleTeams.get(closestTeams[0])!;
	}

	getClosestPossibleTeamSummary(team: IPokemon[] | string[], possibleTeams: DeepImmutable<string[][]>,
		options: IGetPossibleTeamsOptions): string {
		const closestTeam = this.getClosestPossibleTeam(team, possibleTeams, options);
		const summary: string[] = [];
		if (closestTeam.incorrectSize) {
			summary.push("Your team needed to have " + (team.length + closestTeam.incorrectSize) + " Pokemon.");
		}

		if (closestTeam.invalidChoices.length) {
			summary.push(Tools.joinList(closestTeam.invalidChoices) + (closestTeam.invalidChoices.length > 1 ? " were" : " was") +
				" not possible to have based on your options.");
		}

		const evolutions: string[] = [];
		for (const name in closestTeam.extraEvolution) {
			evolutions.push(name + " was evolved " + closestTeam.extraEvolution[name] + " extra " +
				"stage" + (closestTeam.extraEvolution[name] > 1 ? "s" : ""));
		}

		for (const name in closestTeam.missingEvolution) {
			evolutions.push(name + " needed to be evolved " + closestTeam.missingEvolution[name] + " more " +
				"stage" + (closestTeam.missingEvolution[name] > 1 ? "s" : ""));
		}

		for (const name in closestTeam.extraDevolution) {
			evolutions.push(name + " was de-volved " + closestTeam.extraDevolution[name] + " extra " +
				"stage" + (closestTeam.extraDevolution[name] > 1 ? "s" : ""));
		}

		for (const name in closestTeam.missingDevolution) {
			evolutions.push(name + " needed to be de-volved " + closestTeam.missingDevolution[name] + " more " +
				"stage" + (closestTeam.missingDevolution[name] > 1 ? "s" : ""));
		}

		if (evolutions.length) summary.push(Tools.joinList(evolutions) + ".");

		return summary.join(" ");
	}

	private onReload(previous: Dex): void {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (previous.pokemonShowdownDex) {
			const pokemonShowdownDexes = previous.pokemonShowdownDex.dexes;
			for (const mod in pokemonShowdownDexes) {
				const dex = pokemonShowdownDexes[mod];
				const keys = Object.getOwnPropertyNames(dex);
				for (const key of keys) {
					// @ts-expect-error
					dex[key] = undefined;
				}

				// @ts-expect-error
				pokemonShowdownDexes[mod] = undefined;
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (previous.getDexes) {
			const previousDexes = previous.getDexes();
			for (const mod in previousDexes) {
				if (previousDexes[mod] !== previous) {
					const dex = previousDexes[mod];
					const keys = Object.getOwnPropertyNames(dex);
					for (const key of keys) {
						// @ts-expect-error
						dex[key] = undefined;
					}
				}

				// @ts-expect-error
				previousDexes[mod] = undefined;
			}
		}

		const keys = Object.getOwnPropertyNames(previous);
		for (const key of keys) {
			// @ts-expect-error
			previous[key] = undefined;
		}

		this.loadAllData();
	}

	private loadData(): void {
		if (this.dataCache) return;

		if (this.isBase) {
			this.pokemonShowdownDex.includeModData();

			const baseCustomRuleFormats = Object.keys(customRuleFormats);
			for (let i = CURRENT_GEN; i > 0; i--) {
				const gen = 'gen' + i;
				for (const name of baseCustomRuleFormats) {
					const format = gen + customRuleFormats[name].format;
					if (!this.pokemonShowdownDex.formats.get(format).exists) continue;

					customRuleFormats[gen + name] = {
						banlist: customRuleFormats[name].banlist,
						format,
					};
				}
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
		const alternateIconNumbers = require(path.join(this.clientDataDirectory, 'alternate-icon-numbers.js'))
			.alternateIconNumbers as IAlternateIconNumbers;
		// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
		const gifData = require(path.join(this.clientDataDirectory, 'pokedex-mini.js')).BattlePokemonSprites as Dict<IGifData | undefined>;
		// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
		const gifDataBW = require(path.join(this.clientDataDirectory, 'pokedex-mini-bw.js'))
			.BattlePokemonSpritesBW as Dict<IGifData | undefined>;

		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const trainerSpriteList = require(path.join(this.clientDataDirectory, 'trainer-sprites.js')) as string[];
		trainerSpriteList.sort();

		const trainerSprites: Dict<string> = {};
		for (const trainer of trainerSpriteList) {
			trainerSprites[Tools.toId(trainer)] = trainer;
		}

		const parsedCategories: CategoryData = categoryData;
		const speciesList = Object.keys(parsedCategories);
		for (const species of speciesList) {
			const id = Tools.toId(species);
			if (id === species) continue;
			parsedCategories[id] = parsedCategories[species];
			delete parsedCategories[species];
		}

		const abilityKeys = this.pokemonShowdownDex.abilities.all().map(x => x.id);
		const filteredAbilityKeys: string[] = [];
		for (const key of abilityKeys) {
			const ability = this.getAbility(key)!;
			if (ability.gen > this.gen) continue;

			filteredAbilityKeys.push(key);
		}

		const itemKeys = this.pokemonShowdownDex.items.all().map(x => x.id);
		const filteredItemKeys: string[] = [];
		for (const key of itemKeys) {
			const item = this.getItem(key)!;
			if (item.gen > this.gen) continue;

			filteredItemKeys.push(key);
		}

		const typeKeys = this.pokemonShowdownDex.types.all().map(x => x.id);
		const filteredTypeKeys: string[] = [];
		for (const key of typeKeys) {
			const type = this.getType(key)!;
			if (type.id === 'fairy' && this.gen < 6) continue;
			if ((type.id === 'dark' || type.id === 'steel') && this.gen < 2) continue;
			filteredTypeKeys.push(key);
		}

		const validator = new this.pokemonShowdownValidator(this.gen === 8 ? "gen8nationaldex" : "gen" + this.gen + "ou",
			dexes['base'].pokemonShowdownDex);
		const lcFormat = this.pokemonShowdownDex.formats.get("gen" + this.gen + "lc");

		const pokemonKeys = this.pokemonShowdownDex.species.all().map(x => x.id);
		const filteredLearnsetDataKeys: string[] = [];
		const filteredPokemonKeys: string[] = [];
		const moveAvailbilityPokemonList: IPokemon[] = [];
		const colors: Dict<string> = {};
		const eggGroups: Dict<string> = {};
		for (const key of pokemonKeys) {
			const pokemon = this.getPokemon(key)!;
			if (pokemon.gen > this.gen) continue;

			this.cacheAllPossibleMoves(validator, pokemon, filteredTypeKeys);
			this.cacheIsPseudoLCPokemon(pokemon, lcFormat);
			filteredLearnsetDataKeys.push(key);
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

		const moveKeys = this.pokemonShowdownDex.moves.all().map(x => {
			if (x.realMove && Tools.toId(x.realMove) === 'hiddenpower') return Tools.toId(x.name);
			return x.id;
		});
		const filteredMoveKeys: string[] = [];
		for (const key of moveKeys) {
			const move = this.getMove(key)!;
			if (move.gen > this.gen) continue;

			this.cacheMoveAvailability(move, moveAvailbilityPokemonList);
			filteredMoveKeys.push(key);
		}

		const natureKeys = this.pokemonShowdownDex.natures.all().map(x => x.id);
		const filteredNatureKeys: string[] = [];
		for (const key of natureKeys) {
			const nature = this.getNature(key)!;
			if (nature.gen > this.gen) continue;
			filteredNatureKeys.push(key);
		}

		const data: IDataTable = {
			abilityKeys: filteredAbilityKeys,
			formatKeys: this.isBase ? this.pokemonShowdownDex.formats.all().map(x => x.id) : dexes.base.dataCache!.formatKeys.slice(),
			itemKeys: filteredItemKeys,
			learnsetDataKeys: filteredLearnsetDataKeys,
			moveKeys: filteredMoveKeys,
			natureKeys: filteredNatureKeys,
			pokemonKeys: filteredPokemonKeys,
			typeKeys: filteredTypeKeys,
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

		if (this.isBase) {
			for (const key of data.formatKeys) {
				const format = this.getExistingFormat(key);
				if (format.section === OM_OF_THE_MONTH) {
					omotms.push(format.id);
				} else if (format.section === ROA_SPOTLIGHT) {
					roaSpotlights.push(format.id);
				}
			}
		}

		for (const id in customRuleInheritedFormats) {
			const format = this.getFormat(id);
			if (!format) {
				if (id in customRuleInheritedFormatFallbacks) {
					customRuleAliases[customRuleInheritedFormats[id].customRuleAlias] = customRuleInheritedFormatFallbacks[id];
				}
				continue;
			}

			const options = customRuleInheritedFormats[id];
			const rules = format.ruleset.slice();
			for (const ban of format.banlist) {
				if (this.getAbility(ban)) {
					if (options.abilities) rules.push("-" + ban);
				} else if (this.getItem(ban)) {
					if (options.items) rules.push("-" + ban);
				} else if (this.getMove(ban)) {
					if (options.moves) rules.push("-" + ban);
				} else if (this.getPokemon(ban)) {
					if (options.pokemon) rules.push("-" + ban);
				}
			}

			for (const unban of format.unbanlist) {
				if (this.getAbility(unban)) {
					if (options.abilities) rules.push("+" + unban);
				} else if (this.getItem(unban)) {
					if (options.items) rules.push("+" + unban);
				} else if (this.getMove(unban)) {
					if (options.moves) rules.push("+" + unban);
				} else if (this.getPokemon(unban)) {
					if (options.pokemon) rules.push("+" + unban);
				}
			}

			customRuleAliases[customRuleInheritedFormats[id].customRuleAlias] = rules;
		}

		for (let i = 1; i <= 100; i++) {
			clauseNicknames['Adjust Level = ' + i] = 'Level ' + i;
			clauseNicknames['Adjust Level Down = ' + i] = 'Forced Level ' + i;

			customRuleAliases['level' + i] = ['Adjust Level = ' + i];
			customRuleAliases['forcedlevel' + i] = ['Adjust Level Down = ' + i];
		}

		for (let i = 1; i <= 24; i++) {
			clauseNicknames['Max Team Size = ' + i] = 'Bring ' + i;
			clauseNicknames['Min Team Size = ' + i] = 'Bring ' + i + '+';
			clauseNicknames['Picked Team Size = ' + i] = 'Pick ' + i;
			clauseNicknames['Max Move Count = ' + i] = i + ' Move';

			customRuleAliases[i + 'move'] = ['Max Move Count = ' + i];
			customRuleAliases[i + 'moves'] = ['Max Move Count = ' + i];
			customRuleAliases['bring' + i] = ['Max Team Size = ' + i];
			customRuleAliases['minbring' + i] = ['Min Team Size = ' + i];
			customRuleAliases['pick' + i] = ['Picked Team Size = ' + i];
		}

		for (let i = 1; i <= CURRENT_GEN; i++) {
			clauseNicknames['Min Source Gen = ' + i] = 'Gen ' + i + '+';

			customRuleAliases['mingen' + i] = ['Min Source Gen = ' + i];
		}

		for (const key of filteredTypeKeys) {
			const type = this.getExistingType(key);
			clauseNicknames['Force Monotype = ' + type.name] = 'Mono-' + type.name;
			clauseNicknames['Force Monotype = ' + type.id] = 'Mono-' + type.name;

			customRuleAliases['mono' + type.id] = ['Force Monotype = ' + type.name];
		}

		customRuleAliasesByLength = Object.keys(customRuleAliases)
			.sort((a, b) => customRuleAliases[b].length - customRuleAliases[a].length);
	}

	private cacheAllPossibleMoves(validator: IPokemonShowdownValidator, pokemon: IPokemon, typeKeys: string[]): void {
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

		if (possibleMoves.includes('hiddenpower')) {
			for (const type of typeKeys) {
				if (type === 'fairy' || type === 'normal') continue;
				possibleMoves.push('hiddenpower' + type);
			}
		}

		const checkedMoves: string[] = [];
		for (const i of possibleMoves) {
			const move = this.getExistingMove(i);
			// PS move.id compatibility
			if (!checkedMoves.includes(move.id) && move.gen <= this.gen &&
				!validator.checkCanLearn(this.pokemonShowdownDex.moves.get(i), pokemon)) {
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
				if (prevo) {
					firstStage = prevo;
				} else {
					break;
				}
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

	private getCustomFormatNameKey(format: IFormat): string {
		if (!format.customRules || !format.customRules.length) return format.id;
		return format.id + '@@@' + format.customRules.slice().sort().join(',');
	}

	private getPossibleTeamKey(team: readonly string[]): string {
		return team.slice().sort().join(',');
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
		// @ts-expect-error
		global.Dex.onReload(oldDex);
	}
};