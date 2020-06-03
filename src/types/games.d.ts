import type { CommandsDict, ICommandDefinition } from "../command-parser";
import type { UserHosted } from "../games/internal/user-hosted";
import type { PRNGSeed } from "../prng";
import type { DefaultGameOption, Game, IGameOptionValues } from "../room-game";
import type { Room } from "../rooms";
import type { User } from "../users";

export type GameCommandReturnType = boolean;
export type GameDifficulty = 'easy' | 'medium' | 'hard';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface IGameCategoryKeys {
	'board': any;
	'board-property': any;
	'card': any;
	'card-high-low': any;
	'card-matching': any;
	'chain': any;
	'identification': any;
	'knowledge': any;
	'map': any;
	'playing-card': any;
	'puzzle': any;
	'reaction': any;
	'speed': any;
}

export type GameCategory = keyof IGameCategoryKeys;

interface IGameAchievementKeys {
	quickdraw: any;
	captainwordmaster: any;
	wordmaster: any;
	knowitall: any;
	captainknowitall: any;
	fishoutofwater: any;
	goldenmagikarp: any;
	hightidesurvivor: any;
	mazerunner: any;
	kingofthecastle: any;
	minesweeper: any;
	voltorbsfuse: any;
	litwicksflame: any;
	klinksgear: any;
	recklessadventurer: any;
	bankrupt: any;
	achillesheel: any;
	captainachilles: any;
	pokemonprofessor: any;
	moverelearner: any;
	quickrod: any;
	sunkentreasure: any;
	pokemonranger: any;
	rainbowwing: any;
	meowthscoin: any;
	payday: any;
	berrymaster: any;
	skillswapper: any;
	captainskillswapper: any;
	garbagecollector: any;
	technician: any;
	eggthesystem: any;
	luckofthedraw: any;
	drawwizard: any;
	criminalmind: any;
	truedetective: any;
	tallorder: any;
	escapeartist: any;
	movesearchhero: any;
	hotpotatohero: any;
	speedbooster: any;
	cheapskate: any;
	ohbabyatriple: any;
	realestatetycoon: any;
	locksmith: any;
	mountainmover: any;
	spectralsnuffer: any;
	proteaneye: any;
	captainproteaneye: any;
	wonderguardwarrior: any;
	trumpcard: any;
}
/* eslint-enable */

export type GameAchievements = keyof IGameAchievementKeys;

type GameAchievementType = 'first' | 'all-answers' | 'all-answers-team' | 'points' | 'shiny' | 'special';

export interface IGameAchievement {
	description: string;
	name: string;
	type: GameAchievementType;
	bits: number;

	repeatBits?: number;
	mode?: string;
}

export interface IInternalGames {
	eggtoss: string;
	vote: string;
}

export type InternalGameKey = keyof IInternalGames;

interface IGameClass<T extends Game = Game> {
	new(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed): T;
	loadData?: (room: Room | User, extendedClass?: boolean) => void;
	loadedData?: boolean;
}

interface IModeClass<T, U extends Game = Game> {
	new(game: U): T;
	setOptions: <V extends Game>(format: IGameFormat<V>, namePrefixes: string[], nameSuffixes: string[]) => void;
}

interface IGameFileTestConfig {
	async?: boolean;
	inputTargets?: string[];
	commands?: string[][];
}

export interface IGameTestAttributes {
	commands?: readonly string[];
}

type GameFileTests<T extends Game = Game> = Dict<{config?: IGameFileTestConfig; test: ((this: Mocha.Context, game: T,
	format: IGameFormat<T>, attributes: IGameTestAttributes) => void);}>;

export type AchievementsDict = PartialKeyedDict<IGameAchievementKeys, IGameAchievement>;

export interface IRandomGameAnswer {
	answers: string[];
	hint: string;
}

interface IGameFileProperties<T extends Game = Game> {
	achievements?: AchievementsDict;
	aliases?: string[];
	canGetRandomAnswer?: boolean;
	category?: GameCategory;
	commands?: Dict<ICommandDefinition<T>>;
	commandDescriptions?: string[];
	customizableOptions?: Dict<IGameOptionValues>;
	defaultOptions?: DefaultGameOption[];
	disabled?: boolean;
	freejoin?: boolean;
	/** Legacy names, such as from before game mascots were introduced; used for aliases */
	formerNames?: string[];
	mascot?: string;
	mascots?: string[];
	minigameCommand?: string;
	minigameCommandAliases?: string[];
	minigameDescription?: string;
	modes?: string[];
	scriptedOnly?: boolean;
	tests?: GameFileTests<T>;
	variants?: (Partial<T> & IGameVariant)[];
}

export interface IGameFile<T extends Game = Game> extends DeepReadonly<IGameFileProperties<T>> {
	readonly class: IGameClass<T>;
	readonly description: string;
	readonly name: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IGameTemplateFile<T extends Game = Game> extends IGameFileProperties<T> {}

export interface IGameFileComputed<T extends Game = Game> {
	id: string;

	commands?: CommandsDict<T>;
}

export interface IGameFormatData<T extends Game = Game> extends IGameFile<T>, IGameFileComputed<T> {
	commands?: CommandsDict<T>;
}

export interface IGameFormatComputed {
	effectType: 'GameFormat';
	inputOptions: Dict<number>;
	inputTarget: string;
	nameWithOptions: string;

	mode?: IGameMode;
	variant?: IGameVariant;
}

export interface IGameFormat<T extends Game = Game> extends DeepWritable<IGameFormatData<T>>, IGameFormatComputed {
	customizableOptions: Dict<IGameOptionValues>;
	defaultOptions: DefaultGameOption[];
	options: Dict<number>;
}

export interface IGameVariant {
	name: string;
	variant: string;

	commandDescriptions?: string[];
	customizableOptions?: Dict<IGameOptionValues>;
	defaultOptions?: DefaultGameOption[];
	description?: string;
	freejoin?: boolean;
	variantAliases?: string[];
}

export interface IUserHostedFile<T extends UserHosted = UserHosted> {
	class: IGameClass<T>;
	formats: IUserHosted[];
}

export type UserHostedCustomizable = 'name' | 'link';

interface IUserHosted {
	description: string;
	name: string;

	aliases?: string[];
	approvedHostOnly?: boolean;
	customizableAttributes?: UserHostedCustomizable[];
	freejoin?: boolean;
	link?: string;
	mascot?: string;
	mascots?: string[];
}

export interface IUserHostedComputed<T extends UserHosted = UserHosted> extends IUserHosted {
	class: IGameClass<T>;
	id: string;
}

export interface IUserHostedFormatComputed {
	effectType: 'UserHostedFormat';
	inputOptions: Dict<number>;
	inputTarget: string;
	nameWithOptions: string;
	options: Dict<number>;
}

export interface IUserHostedFormat<T extends UserHosted = UserHosted> extends IUserHostedComputed<T>, IUserHostedFormatComputed {}

export interface IGameModeFile<T = Game, U extends Game = Game, V extends Game = Game> {
	class: IModeClass<T, U>;
	description: string;
	initialize: (game: U) => void;
	name: string;
	naming: 'prefix' | 'suffix';

	aliases?: string[];
	commands?: CommandsDict<T & U, GameCommandReturnType>;
	removedOptions?: string[];
	tests?: GameFileTests<V>;
}

export interface IGameMode<T = Game, U extends Game = Game> extends IGameModeFile<T, U> {
	id: string;
}
