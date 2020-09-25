import type { UserHosted } from "../games/internal/user-hosted";
import type { PRNGSeed } from "../prng";
import type { Player } from "../room-activity";
import type { Game } from "../room-game";
import type { Room } from "../rooms";
import type { User } from "../users";
import type { ParametersWorker } from '../workers/parameters';
import type { PortmanteausWorker } from '../workers/portmanteaus';
import type { CommandDefinitions, LoadedCommands } from "./command-parser";
import type { IPokemon } from "./dex";
import type { IBattleData } from "./tournaments";

export interface IGamesWorkers {
	parameters: ParametersWorker;
	portmanteaus: PortmanteausWorker;
}

export type GameCommandReturnType = boolean;
export type GameCommandDefinitions<T extends Game = Game> = CommandDefinitions<T, GameCommandReturnType>;
export type LoadedGameCommands<T extends Game = Game> = LoadedCommands<T, GameCommandReturnType>;

export type GameDifficulty = 'easy' | 'medium' | 'hard';
export type AutoCreateTimerType = 'scripted' | 'tournament' | 'userhosted';

export type GameCategory = 'board' | 'board-property' | 'card' | 'card-high-low' | 'card-matching' | 'chain' | 'elimination-tournament' |
	'identification' | 'knowledge' | 'luck' | 'map' | 'puzzle' | 'reaction' | 'speed' | 'strategy';

export type GameChallenge = 'onevsone';

export type GameAchievements = 'quickdraw' | 'captainwordmaster' | 'wordmaster' | 'knowitall' | 'captainknowitall' | 'fishoutofwater' |
	'goldenmagikarp' | 'hightidesurvivor' | 'mazerunner' | 'kingofthecastle' | 'minesweeper' | 'voltorbsfuse' | 'litwicksflame' |
	'klinksgear' | 'recklessadventurer' | 'bankrupt' | 'achillesheel' | 'captainachilles' | 'pokemonprofessor' | 'moverelearner' |
	'quickrod' | 'sunkentreasure' | 'pokemonranger' | 'rainbowwing' | 'meowthscoin' | 'payday' | 'berrymaster' | 'skillswapper' |
	'captainskillswapper' | 'garbagecollector' | 'technician' | 'eggthesystem' | 'luckofthedraw' | 'drawwizard' | 'criminalmind' |
	'truedetective' | 'tallorder' | 'escapeartist' | 'movesearchhero' | 'hotpotatohero' | 'speedbooster' | 'cheapskate' | 'ohbabyatriple' |
	'realestatetycoon' | 'locksmith' | 'mountainmover' | 'spectralsnuffer' | 'proteaneye' | 'captainproteaneye' | 'wonderguardwarrior' |
	'trumpcard';

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
	headtohead: string;
	onevsone: string;
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

export type AchievementsDict = PartialKeyedDict<GameAchievements, IGameAchievement>;

export interface IRandomGameAnswer {
	answers: string[];
	hint: string;
}

export type DefaultGameOption = 'points' | 'teams' | 'cards' | 'freejoin';
export interface IGameOptionValues {
	min: number;
	base: number;
	max: number;
}

export type GameCommandListener = (lastUserid: string) => void;

export interface IGameCommandCountOptions {
	max: number;
	remainingPlayersMax?: boolean;
}

export interface IGameCommandCountListener extends IGameCommandCountOptions {
	commands: string[];
	count: number;
	lastUserId: string;
	listener: GameCommandListener;
}

type IGameVariant<T extends Game = Game> = Partial<T> & IGameVariantProperties<T>;

interface IGameFileProperties<T extends Game = Game> {
	achievements?: AchievementsDict;
	aliases?: string[];
	canGetRandomAnswer?: boolean;
	category?: GameCategory;
	challengePoints?: PartialKeyedDict<GameChallenge, number>;
	commands?: GameCommandDefinitions<T>;
	commandDescriptions?: string[];
	customizableOptions?: Dict<IGameOptionValues>;
	defaultOptions?: DefaultGameOption[];
	disabled?: boolean;
	freejoin?: boolean;
	/** Legacy names, such as from before game mascots were introduced; used for aliases */
	formerNames?: string[];
	mascot?: string;
	mascots?: string[];
	mascotPrefix?: string;
	minigameCommand?: string;
	minigameCommandAliases?: string[];
	minigameDescription?: string;
	modeProperties?: Dict<Partial<T>>;
	modes?: string[];
	noOneVsOne?: boolean;
	nonTrivialLoadData?: boolean;
	scriptedOnly?: boolean;
	tests?: GameFileTests<T>;
	tournamentGame?: boolean;
	variants?: IGameVariant<T>[];
}

export interface IGameFile<T extends Game = Game> extends IGameFileProperties<T> {
	readonly class: IGameClass<T>;
	readonly description: string;
	readonly name: string;

	readonly additionalDescription?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IGameTemplateFile<T extends Game = Game> extends IGameFileProperties<T> {}

export interface IGameFileComputed<T extends Game = Game> {
	id: string;

	commands?: LoadedGameCommands<T>;
}

export interface IGameFormatData<T extends Game = Game> extends IGameFile<T>, IGameFileComputed<T> {
	commands?: LoadedGameCommands<T>;
}

export interface IGameFormatComputed<T extends Game = Game> {
	effectType: 'GameFormat';
	inputOptions: Dict<number>;
	inputTarget: string;
	nameWithOptions: string;

	mode?: IGameMode;
	variant?: IGameVariant<T>;
}

export interface IGameFormat<T extends Game = Game> extends IGameFormatData<T>, IGameFormatComputed<T> {
	customizableOptions: Dict<IGameOptionValues>;
	defaultOptions: DefaultGameOption[];
	description: string;
	options: Dict<number>;
}

export interface IGameVariantProperties<T extends Game = Game> {
	name: string;
	variant: string;

	commandDescriptions?: string[];
	customizableOptions?: Dict<IGameOptionValues>;
	defaultOptions?: DefaultGameOption[];
	description?: string;
	freejoin?: boolean;
	modeProperties?: Dict<Partial<T>>;
	modes?: string[];
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
	mascotPrefix?: string;
	teamGame?: boolean;
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
	commands?: LoadedGameCommands<T & U>;
	removedOptions?: string[];
	tests?: GameFileTests<V>;
}

export interface IGameMode<T = Game, U extends Game = Game> extends IGameModeFile<T, U> {
	id: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlayerList = Dict<Player> | Player[] | Map<Player, any>;

export type LoadedGameFile = DeepImmutable<IGameFormatData>;

export interface IPokemonUhtml {
	pokemon: string[];
	type: 'gif' | 'icon';
	uhtmlName: string;
	user: string;
}

export interface ITrainerUhtml {
	trainerList: string[];
	uhtmlName: string;
	user: string;
}

export interface IBattleGameData extends IBattleData {
	pokemonCounts: Dict<number>;
	pokemon: Dict<string[]>;
	pokemonLeft: Dict<number>;
	nicknames: Dict<Dict<string>>;
	wrongTeam: Map<Player, boolean>;
	faintedCloakedPokemon: Dict<number>;
}
