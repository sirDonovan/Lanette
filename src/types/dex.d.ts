import type { IParsedSmogonLink } from "./tools";

export interface IAlternateIconNumbers {
	left: Dict<number | undefined>;
	right: Dict<number | undefined>;
}

export type RegionName = 'kanto' | 'johto' | 'hoenn' | 'sinnoh' | 'unova' | 'kalos' | 'alola' | 'galar' | 'hisui' | 'paldea';
export type BadgeData = KeyedDict<RegionName, string[]>;
export type CategoryData = Dict<string>;
export type CharacterType = 'player' | 'rival' | 'gymleader' | 'elitefour' | 'champion' | 'frontierbrain' | 'professor' | 'antagonist' |
	'other';
export type CharacterData = KeyedDict<RegionName, KeyedDict<CharacterType, string[]>>;
export type LocationType = 'town' | 'city' | 'cave' | 'forest' | 'mountain' | 'other';
export type LocationData = KeyedDict<RegionName, KeyedDict<LocationType, string[]>>;
export type TrainerClassData = string[];
export type ModelGeneration = 'rb' | 'gs' | 'rs' | 'dp' | 'bw' | 'xy';

export interface IFormatDataLinks {
	aliases?: string[];
	desc?: string;
	info?: string;
	'info-official'?: IParsedSmogonLink;
	roleCompendium?: string;
	ruinsOfAlphTeams?: string;
	teams?: string;
	'teams-official'?: IParsedSmogonLink;
	viability?: string;
	'viability-official'?: IParsedSmogonLink;
}

export interface ISeparatedCustomRules {
	addedbans: string[];
	removedbans: string[];
	addedrestrictions: string[];
	addedrules: string[];
	removedrules: string[];
}

export interface IGifDirectionData {
	h: number;
	w: number;
}

export interface IGifData {
	back?: IGifDirectionData;
	front?: IGifDirectionData;
}

export interface IGetPossibleTeamsOptions {
	additions?: number;
	drops?: number;
	evolutions?: number;
	allowFormes?: boolean;
	requiredAddition?: boolean;
	requiredDrop?: boolean;
	requiredEvolution?: boolean;
	speciesClause?: boolean;
	usablePokemon?: string[];
}

export interface IClosestPossibleTeam {
	validTeam: boolean;
	incorrectSize: number;
	incorrectPokemon: string[];
	invalidChoices: string[];
	extraEvolution: Dict<number>;
	missingEvolution: Dict<number>;
	extraDevolution: Dict<number>;
	missingDevolution: Dict<number>;
}

type DataKeys = readonly string[];

export type TrainerSpriteId = Branded<"trainer-sprite-id", string>;

export interface IDataTable {
	readonly abilityKeys: DataKeys;
	readonly alternateIconNumbers: Readonly<IAlternateIconNumbers>;
	readonly badges: Readonly<BadgeData>;
	readonly categories: Readonly<Dict<string | undefined>>;
	readonly characters: Readonly<CharacterData>;
	readonly colors: Readonly<Dict<string>>;
	readonly eggGroups: Readonly<Dict<string>>;
	readonly formatKeys: DataKeys;
	readonly gifData: Readonly<Dict<IGifData | undefined>>;
	readonly gifDataBW: Readonly<Dict<IGifData | undefined>>;
	readonly itemKeys: DataKeys;
	readonly learnsetDataKeys: DataKeys;
	readonly locations: Readonly<LocationData>;
	readonly moveKeys: DataKeys;
	readonly natureKeys: DataKeys;
	readonly pokemonKeys: DataKeys;
	readonly rulesetKeys: DataKeys;
	readonly trainerClasses: Readonly<TrainerClassData>;
	readonly trainerSprites: Readonly<Dict<string>>;
	readonly typeKeys: DataKeys;
}