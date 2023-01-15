import type { IPokemonPick } from "../html-pages/components/pokemon-picker-base";
import type { ITrainerPick } from "../html-pages/components/trainer-picker";
import type { PRNGSeed } from "../lib/prng";
import type { Player } from "../room-activity";
import type { ScriptedGame } from "../room-game-scripted";
import type { UserHostedGame } from "../room-game-user-hosted";
import type { Room } from "../rooms";
import type { User } from "../users";
import type { ParametersWorker } from '../workers/parameters';
import type { PortmanteausWorker } from '../workers/portmanteaus';
import type { CommandDefinitions, LoadedCommands } from "./command-parser";

export interface IGamesWorkers {
	parameters: ParametersWorker;
	portmanteaus: PortmanteausWorker;
}

export type GameCommandReturnType = boolean;
export type GameCommandDefinitions<T extends ScriptedGame = ScriptedGame> = CommandDefinitions<T, GameCommandReturnType>;
export type LoadedGameCommands<T extends ScriptedGame = ScriptedGame> = LoadedCommands<T, GameCommandReturnType>;

export type GameDifficulty = 'easy' | 'medium' | 'hard';
export type AutoCreateTimerType = 'scripted' | 'tournament' | 'userhosted';

export type GameCategory = 'battle-elimination' | 'chain' | 'identification-1' | 'identification-2' | 'knowledge-1' | 'knowledge-2' |
	'knowledge-3' | 'luck' | 'map' | 'puzzle' | 'reaction' | 'search-challenge' | 'speed' | 'tabletop';

export type GameMode = 'abridged' | 'collectiveteam' | 'multianswer' | 'pmtimeattack' | 'prolix' | 'spotlightteam' | 'survival' |
	'timeattack';

export type GameChallenge = 'botchallenge' | 'onevsone';

export type GameAchievements = 'quickdraw' | 'captainwordmaster' | 'wordmaster' | 'knowitall' | 'captainknowitall' | 'fishoutofwater' |
	'goldenmagikarp' | 'hightidesurvivor' | 'mazerunner' | 'kingofthecastle' | 'minesweeper' | 'voltorbsfuse' | 'litwicksflame' |
	'klinksgear' | 'recklessadventurer' | 'bankrupt' | 'achillesheel' | 'captainachilles' | 'pokemonprofessor' | 'moverelearner' |
	'quickrod' | 'sunkentreasure' | 'pokemonranger' | 'rainbowwing' | 'meowthscoin' | 'payday' | 'berrymaster' | 'skillswapper' |
	'captainskillswapper' | 'garbagecollector' | 'technician' | 'eggthesystem' | 'luckofthedraw' | 'drawwizard' | 'criminalmind' |
	'truedetective' | 'tallorder' | 'escapeartist' | 'movesearchhero' | 'hotpotatohero' | 'speedbooster' | 'cheapskate' | 'ohbabyatriple' |
	'realestatetycoon' | 'locksmith' | 'mountainmover' | 'spectralsnuffer' | 'proteaneye' | 'captainproteaneye' | 'wonderguardwarrior' |
	'trumpcard' | 'swiftplacing' | 'alphabetsweep' | 'livingontheedge' | 'splittersplatter' | 'mnemonicmaster' | 'thegreatestshowman' |
	'mootronome' | 'genusgenius' | 'cognitivecerebrum' | 'privateinvestigator';

type GameAchievementType = 'first' | 'all-answers' | 'all-answers-team' | 'points' | 'shiny' | 'special';

export interface IGameAchievement {
	description: string;
	name: string;
	type: GameAchievementType;
	bits: number;

	repeatBits?: number;
	minigame?: boolean;
	mode?: GameMode;
}

export type InternalGame = GameChallenge | 'eggtoss' | 'headtohead' | 'sweetthief' | 'vote';

export interface IGameCachedData {
	categories?: readonly string[];
	categoryHintAnswers?: Dict<Dict<readonly string[]>>;
	categoryHintKeys?: Dict<readonly string[]>;
	inverseCategories?: readonly string[];
	inverseCategoryHintAnswers?: Dict<Dict<readonly string[]>>;
	inverseCategoryHintKeys?: Dict<readonly string[]>;
	hintAnswers?: Dict<readonly string[]>;
	hintKeys?: readonly string[];
	inverseHintAnswers?: Dict<readonly string[]>;
	inverseHintKeys?: readonly string[];
}

interface IGameClass<T extends ScriptedGame = ScriptedGame> {
	new(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed): T;
	achievements?: Dict<IGameAchievement>;
	cachedData?: IGameCachedData;
	loadData?: (room: Room | User, extendedClass?: boolean) => void;
	loadedData?: boolean;
}

export interface IModeInputProperties {
	customizableNumberOptions?: Dict<IGameNumberOptionValues>;
	defaultOptions?: DefaultGameOption[];
	description?: string;
	namePrefixes?: string[];
	nameSuffixes?: string[];
}

export interface IGameInputProperties extends IModeInputProperties {
	options: IGameOptions;
}

interface IModeClass<T, U extends ScriptedGame = ScriptedGame> {
	new(game: U): T;
	resolveInputProperties: <V extends ScriptedGame>(format: IGameFormat<V>,
		customizableNumberOptions: Dict<IGameNumberOptionValues>) => IModeInputProperties;
}

interface IGameFileTestConfig {
	async?: boolean;
	inputTargets?: string[];
	commands?: string[][];
	regressionOnly?: boolean;
}

export interface IGameTestAttributes {
	commands?: readonly string[];
}

interface IGameFileTest<T extends ScriptedGame = ScriptedGame> {
	config?: IGameFileTestConfig;
	test: ((this: Mocha.Context, game: T, format: IGameFormat<T>, attributes: IGameTestAttributes) => Promise<void> | void);
}

type GameFileTests<T extends ScriptedGame = ScriptedGame> = Dict<IGameFileTest<T>>;

export interface IRandomGameAnswer {
	answers: readonly string[];
	hint: string;
}

export type DefaultGameOption = 'points' | 'teams' | 'cards' | 'freejoin';
export interface IGameNumberOptionValues {
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

type IGameVariant<T extends ScriptedGame = ScriptedGame> = Partial<T> & IGameVariantProperties;

export interface IChallengeSettings {
	enabled: boolean,
	points?: number;
	options?: string[];
	requiredFreejoin?: boolean;
	requiredOptions?: string[];
}

export type GameChallengeSettings = PartialKeyedDict<GameChallenge, IChallengeSettings>;

interface IGameFileProperties<T extends ScriptedGame = ScriptedGame> {
	aliases?: string[];
	canGetRandomAnswer?: boolean;
	category?: GameCategory;
	challengeSettings?: GameChallengeSettings;
	commands?: GameCommandDefinitions<T>;
	commandDescriptions?: string[];
	customizableNumberOptions?: Dict<IGameNumberOptionValues>;
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
	modeProperties?: PartialKeyedDict<GameMode, Partial<T>>;
	modes?: GameMode[];
	nonTrivialLoadData?: boolean;
	scriptedOnly?: boolean;
	searchChallenge?: boolean;
	tests?: GameFileTests<T>;
	tournamentGame?: boolean;
	variants?: IGameVariant<T>[];
}

export interface IGameFile<T extends ScriptedGame = ScriptedGame> extends IGameFileProperties<T> {
	readonly class: IGameClass<T>;
	readonly description: string;
	readonly name: string;

	readonly additionalDescription?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IGameTemplateFile<T extends ScriptedGame = ScriptedGame> extends IGameFileProperties<T> {}

export interface IGameFileComputed<T extends ScriptedGame = ScriptedGame> {
	id: string;

	commands?: LoadedGameCommands<T>;
}

export interface IGameFormatData<T extends ScriptedGame = ScriptedGame> extends IGameFile<T>, IGameFileComputed<T> {
	commands?: LoadedGameCommands<T>;
}

export interface IGameOptions {
	[index: string]: string | number | undefined;
	points?: number;
	teamPoints?: number;
	freejoin?: number;
	cards?: number;
	operands?: number;
	names?: number;
	gen?: number;
	params?: number;
	ports?: number;
	teams?: number;
	format?: string;
	rules?: string;
}

export type GameNumberOptions = keyof FilterByType<IGameOptions, number | undefined>;

export interface IGameFormatComputed<T extends ScriptedGame = ScriptedGame> {
	effectType: 'GameFormat';
	inputOptions: IGameOptions;
	inputTarget: string;
	nameWithOptions: string;

	mode?: IGameMode;
	variant?: IGameVariant<T>;
}

export interface IGameFormat<T extends ScriptedGame = ScriptedGame> extends IGameFormatData<T>, IGameFormatComputed<T> {
	minigameCreator?: string;
	customizableNumberOptions: Dict<IGameNumberOptionValues>;
	defaultOptions: DefaultGameOption[];
	description: string;
	resolvedInputProperties: IGameInputProperties;
	voter?: string;
}

export interface IGameVariantProperties {
	name: string;
	variantAliases: string[];

	aliases?: string[];
	challengeSettings?: PartialKeyedDict<GameChallenge, IChallengeSettings>;
	commandDescriptions?: string[];
	customizableNumberOptions?: Dict<IGameNumberOptionValues>;
	defaultOptions?: DefaultGameOption[];
	description?: string;
	freejoin?: boolean;
	modes?: GameMode[];
}

interface IUserHostedGameClass<T extends UserHostedGame = UserHostedGame> {
	new(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed): T;
}

export interface IUserHostedFile<T extends UserHostedGame = UserHostedGame> {
	class: IUserHostedGameClass<T>;
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

export interface IUserHostedComputed<T extends UserHostedGame = UserHostedGame> extends IUserHosted {
	class: IUserHostedGameClass<T>;
	id: string;
}

export interface IUserHostedFormatComputed {
	effectType: 'UserHostedFormat';
	inputTarget: string;
	nameWithOptions: string;
}

export interface IUserHostedFormat<T extends UserHostedGame = UserHostedGame> extends IUserHostedComputed<T>, IUserHostedFormatComputed {}

export interface IGameModeFile<T = ScriptedGame, U extends ScriptedGame = ScriptedGame, V extends ScriptedGame = ScriptedGame> {
	class: IModeClass<T, U>;
	description: string;
	initialize: (game: U) => void;
	name: string;
	naming: 'prefix' | 'suffix';

	aliases?: string[];
	challengeSettings?: GameChallengeSettings;
	commands?: LoadedGameCommands<T & U>;
	cooldownId?: GameMode;
	cooldownName?: string;
	removedOptions?: string[];
	tests?: GameFileTests<V>;
}

export interface IGameMode<T = ScriptedGame, U extends ScriptedGame = ScriptedGame> extends IGameModeFile<T, U> {
	id: GameMode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlayerList = Dict<Player> | readonly Player[] | Map<Player, any>;

export type LoadedGameFile = DeepImmutable<IGameFormatData>;

export interface IHostDisplayUhtml {
	html: string;
	pokemon: IPokemonPick[];
	trainers: ITrainerPick[];
	pokemonType: 'gif' | 'icon';
	uhtmlName: string;
	user: string;
}

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

export interface IBattleGameData {
	faintedCloakedPokemon: Dict<number>;
	nicknames: Dict<Dict<string>>;
	pokemonCounts: Dict<number>;
	pokemon: Dict<string[]>;
	pokemonLeft: Dict<number>;
	remainingPokemon: Dict<number>;
	slots: Map<Player, string>;
	wrongTeam: Map<Player, boolean>;
}

export interface IMonthlyGameSchedule {
	formats: Dict<string[]>;
	times: [number, number][];
	year: number;
}

export interface IRoomGameSchedule {
	months: Dict<IMonthlyGameSchedule>;
}

export interface IScheduledGameTimerData {
	formatid: string;
	startTime: number;
	official?: boolean;
}

export interface IScheduledGame {
	format: string;
	time: number;
	official?: boolean;
}

export interface IOfficialGame extends IScheduledGame {
	official: true;
}