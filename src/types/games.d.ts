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

export type GameCategory = 'board' | 'board-property' | 'card' | 'card-high-low' | 'card-matching' | 'chain' | 'elimination-tournament' |
	'identification' | 'knowledge' | 'luck' | 'map' | 'puzzle' | 'reaction' | 'speed' | 'strategy' | 'visual';

export type GameMode = 'group' | 'multianswer' | 'survival' | 'team' | 'timeattack';

export type GameChallenge = 'onevsone';

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

export interface IInternalGames {
	eggtoss: string;
	headtohead: string;
	onevsone: string;
	vote: string;
}

export type InternalGameKey = keyof IInternalGames;

interface IGameClass<T extends ScriptedGame = ScriptedGame> {
	new(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed): T;
	achievements?: Dict<IGameAchievement>;
	loadData?: (room: Room | User, extendedClass?: boolean) => void;
	loadedData?: boolean;
}

interface IModeClass<T, U extends ScriptedGame = ScriptedGame> {
	new(game: U): T;
	setOptions: <V extends ScriptedGame>(format: IGameFormat<V>, namePrefixes: string[], nameSuffixes: string[]) => void;
}

interface IGameFileTestConfig {
	async?: boolean;
	inputTargets?: string[];
	commands?: string[][];
}

export interface IGameTestAttributes {
	commands?: readonly string[];
}

type GameFileTests<T extends ScriptedGame = ScriptedGame> = Dict<{config?: IGameFileTestConfig; test: ((this: Mocha.Context, game: T,
	format: IGameFormat<T>, attributes: IGameTestAttributes) => void);}>;

export interface IRandomGameAnswer {
	answers: readonly string[];
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

type IGameVariant<T extends ScriptedGame = ScriptedGame> = Partial<T> & IGameVariantProperties<T>;

interface IGameFileProperties<T extends ScriptedGame = ScriptedGame> {
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
	modeProperties?: PartialKeyedDict<GameMode, Partial<T>>;
	modes?: GameMode[];
	noOneVsOne?: boolean;
	nonTrivialLoadData?: boolean;
	scriptedOnly?: boolean;
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

export interface IGameFormatComputed<T extends ScriptedGame = ScriptedGame> {
	effectType: 'GameFormat';
	inputOptions: Dict<number>;
	inputTarget: string;
	nameWithOptions: string;

	mode?: IGameMode;
	variant?: IGameVariant<T>;
}

export interface IGameFormat<T extends ScriptedGame = ScriptedGame> extends IGameFormatData<T>, IGameFormatComputed<T> {
	customizableOptions: Dict<IGameOptionValues>;
	defaultOptions: DefaultGameOption[];
	description: string;
	options: Dict<number>;
	voter?: string;
}

export interface IGameVariantProperties<T extends ScriptedGame = ScriptedGame> {
	name: string;
	variantAliases: string[];

	aliases?: string[];
	commandDescriptions?: string[];
	customizableOptions?: Dict<IGameOptionValues>;
	defaultOptions?: DefaultGameOption[];
	description?: string;
	freejoin?: boolean;
	noOneVsOne?: boolean;
	modeProperties?: PartialKeyedDict<GameMode, Partial<T>>;
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
	inputOptions: Dict<number>;
	inputTarget: string;
	nameWithOptions: string;
	options: Dict<number>;
}

export interface IUserHostedFormat<T extends UserHostedGame = UserHostedGame> extends IUserHostedComputed<T>, IUserHostedFormatComputed {}

export interface IGameModeFile<T = ScriptedGame, U extends ScriptedGame = ScriptedGame, V extends ScriptedGame = ScriptedGame> {
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

export interface IGameMode<T = ScriptedGame, U extends ScriptedGame = ScriptedGame> extends IGameModeFile<T, U> {
	id: GameMode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlayerList = Dict<Player> | readonly Player[] | Map<Player, any>;

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
