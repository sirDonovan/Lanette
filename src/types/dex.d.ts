export interface IAlternateIconNumbers {
	left: Dict<number | undefined>;
	right: Dict<number | undefined>;
}

export type BadgeData = Dict<string[]>;
export type CategoryData = Dict<string>;
export type CharacterData = Dict<string[]>;

export type LocationTypes = 'town' | 'city' | 'cave' | 'forest' | 'mountain' | 'other';
export type LocationData = Dict<KeyedDict<LocationTypes, string[]>>;
export type TrainerClassData = string[];

export interface IFormatDataLinks {
	aliases?: string[];
	desc?: string;
	info?: string;
	'info-official'?: string;
	roleCompendium?: string;
	teams?: string;
	'teams-official'?: string;
	viability?: string;
	'viability-official'?: string;
}

export interface IFormatThread {
	description: string;
	id: string;
}

export interface ISeparatedCustomRules {
	addedbans: string[];
	removedbans: string[];
	addedrestrictions: string[];
	addedrules: string[];
	removedrules: string[];
}

export interface IGifData {
	back?: {h: number; w: number};
	front?: {h: number; w: number};
}

export interface IGetPossibleTeamsOptions {
	additions?: number;
	drops?: number;
	evolutions?: number;
	allowFormes?: boolean;
	requiredAddition?: boolean;
	requiredDrop?: boolean;
	requiredEvolution?: boolean;
	usablePokemon?: string[];
}

export interface IDataTable {
	readonly abilityKeys: readonly string[];
	readonly alternateIconNumbers: Readonly<IAlternateIconNumbers>;
	readonly badges: Readonly<BadgeData>;
	readonly categories: Readonly<Dict<string | undefined>>;
	readonly characters: Readonly<CharacterData>;
	readonly colors: Readonly<Dict<string>>;
	readonly eggGroups: Readonly<Dict<string>>;
	readonly formatKeys: readonly string[];
	readonly gifData: Readonly<Dict<IGifData | undefined>>;
	readonly gifDataBW: Readonly<Dict<IGifData | undefined>>;
	readonly itemKeys: readonly string[];
	readonly learnsetDataKeys: readonly string[];
	readonly locations: Readonly<LocationData>;
	readonly moveKeys: readonly string[];
	readonly natureKeys: readonly string[];
	readonly pokemonKeys: readonly string[];
	readonly trainerClasses: Readonly<TrainerClassData>;
	readonly trainerSprites: Readonly<Dict<string>>;
	readonly typeKeys: readonly string[];
}