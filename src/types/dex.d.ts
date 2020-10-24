import type { INature } from "./pokemon-showdown";

export interface IFormatDataLinks {
	aliases?: string[];
	desc?: string;
	generator?: string;
	info?: string;
	'info-official'?: string;
	roleCompendium?: string;
	teams?: string;
	'teams-official'?: string;
	userHosted?: boolean;
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
	readonly alternateIconNumbers: Readonly<{left: Dict<number | undefined>, right: Dict<number | undefined>}>;
	readonly badges: readonly string[];
	readonly categories: Readonly<Dict<string | undefined>>;
	readonly characters: readonly string[];
	readonly colors: Readonly<Dict<string>>;
	readonly eggGroups: Readonly<Dict<string>>;
	readonly formatKeys: readonly string[];
	readonly gifData: Readonly<Dict<IGifData | undefined>>;
	readonly gifDataBW: Readonly<Dict<IGifData | undefined>>;
	readonly itemKeys: readonly string[];
	readonly learnsetDataKeys: readonly string[];
	readonly locations: readonly string[];
	readonly moveKeys: readonly string[];
	readonly natures: Readonly<Dict<INature | undefined>>;
	readonly pokemonKeys: readonly string[];
	readonly trainerClasses: readonly string[];
	readonly trainerSprites: Readonly<Dict<string>>;
	readonly typeKeys: readonly string[];
}