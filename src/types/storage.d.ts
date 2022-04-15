import type { IPokemonPick } from "../html-pages/components/pokemon-picker-base";
import type { ITrainerPick } from "../html-pages/components/trainer-picker";
import type { ModelGeneration, TrainerSpriteId } from "./dex";
import type { BorderType, HexCode, TimeZone } from "./tools";

interface IEventInformation {
	name: string;
	link?: {description: string; url: string};
	formatIds?: string[];
}

interface ILeaderboardEntry {
	annual: number;
	annualSources: Dict<number>;
	current: number;
	name: string;
	sources: Dict<number>;
}

interface IQueuedUserHostedGame {
	format: string;
	id: string;
	name: string;
}

interface IBotGreeting {
	greeting: string;
	expiration?: number;
}

export interface IPastTournament {
	inputTarget: string;
	name: string;
	time: number;
}

export interface IPastGame {
	inputTarget: string;
	name: string;
	time: number;
}

export interface ITournamentTrainerCard {
	avatar?: TrainerSpriteId;
	badges?: string[];
	bio?: string;
	customAvatar?: string;
	favoriteFormat?: string;
	footer?: HexCode;
	header?: HexCode;
	pokemon?: string[];
	table?: HexCode;
}

export interface IGameTrainerCard {
	pokemon: string[];
	avatar?: TrainerSpriteId;
	background?: HexCode;
	pokemonGifs?: boolean;
}

export interface ICustomBorder {
	color?: HexCode;
	radius?: number;
	size?: number;
	type?: BorderType;
}

export interface IGameCustomBox {
	background?: HexCode;
	backgroundBorder?: ICustomBorder;
	buttons?: HexCode;
	buttonsBorder?: ICustomBorder;
	signupsBackground?: HexCode;
	signupsBackgroundBorder?: ICustomBorder;
	signupsButtons?: HexCode;
	signupsButtonsBorder?: ICustomBorder;
	gameBackground?: HexCode;
	gameBackgroundBorder?: ICustomBorder;
	gameButtons?: HexCode;
	gameButtonsBorder?: ICustomBorder;
}

export interface IGameHostBox extends IGameCustomBox {
	pokemon: IPokemonPick[];
	avatar?: TrainerSpriteId;
}

export interface IGameScriptedBox extends IGameCustomBox {
	mascotGeneration?: ModelGeneration;
	pokemonAvatar?: string;
	previewFormat?: string;
}

export type GifIcon = 'gif' | 'icon';

export interface IGameHostDisplay extends IGameCustomBox {
	pokemon: IPokemonPick[];
	trainers: ITrainerPick[];
	gifOrIcon: GifIcon;
}

export type GameActionLocations = 'htmlpage' | 'chat';
export type GameActionGames = 'card' | 'map' | 'greedentsberrypiles' | 'magikarpswaterwheel' | '';
export interface IGameScriptedOptions {
	actionsLocations?: PartialKeyedDict<GameActionGames, GameActionLocations>;
	assistActions?: boolean;
}

export type UserHostStatus = 'unapproved' | 'novice' | 'approved';

export interface IUserHostStatusData {
	status: UserHostStatus;
	previousStatus?: UserHostStatus;
	expirationTime: number;
}

export type LeaderboardType = 'gameLeaderboard' | 'gameHostingLeaderbaord' | 'tournamentLeaderboard' | 'unsortedLeaderboard';

export interface ILeaderboard {
	entries: Dict<ILeaderboardEntry>;
	sources: string[];
	type: LeaderboardType;
}

export interface IPointTotalsByType {
	annual: Dict<number>;
	current: Dict<number>;
}

export interface ICachedLeaderboardEntry {
	id: string;
	name: string;
	points: number;
}

export interface IPointBreakdownsByType {
	annual: Dict<IUserPointBreakdowns>;
	current: Dict<IUserPointBreakdowns>;
}

export interface IUserPointBreakdowns {
	total: number;
	breakdowns: Dict<IPointBreakdown>;
}

export interface IPointBreakdown {
	points: number;
	percentage: number;
}

export interface ICachedPointsBreakdown {
	id: string;
	name: string;
	breakdown: IUserPointBreakdowns;
}

export interface IGameStat {
	format: string;
	inputTarget: string;
	startingPlayerCount: number;
	endingPlayerCount: number;
	startTime: number;
	endTime: number;
	winners: string[];
}

interface IQueuedTournament {
	formatid: string;
	playerCap: number;
	scheduled: boolean;
	time: number;
	tournamentName?: string;
}

interface ITournamentGameBan {
	name: string;
	expirationTime: number;
}

export interface IPreviousCycle {
	cycleStartDate: string;
	cycleEndDate: string;
	gameHostingLeaderbaord?: ILeaderboard;
	gameLeaderboard?: ILeaderboard;
	scriptedGameCounts?: Dict<number>;
	scriptedGameStats?: IGameStat[];
	tournamentLeaderboard?: ILeaderboard;
	unsortedLeaderboard?: ILeaderboard;
	userHostedGameCounts?: Dict<number>;
	userHostedGameStats?: Dict<IGameStat[]>;
}

export interface IDatabase {
	botGreetings?: Dict<IBotGreeting>;
	cycleStartDate?: string;
	eventInformation?: Dict<IEventInformation>;
	gameAchievements?: Dict<string[]>;
	gameLeaderboard?: ILeaderboard;
	gameHostingLeaderbaord?: ILeaderboard;
	gameHostBoxes?: Dict<IGameHostBox>;
	gameHostDisplays?: Dict<IGameHostDisplay>;
	gameScriptedBoxes?: Dict<IGameScriptedBox>;
	gameFormatScriptedBoxes?: Dict<Dict<IGameScriptedBox>>;
	gameScriptedOptions?: Dict<IGameScriptedOptions>;
	gameTrainerCards?: Dict<IGameTrainerCard>;
	lastGameFormatTimes?: Dict<number>;
	lastGameTime?: number;
	lastTournamentFormatTimes?: Dict<number>;
	lastTournamentTime?: number;
	lastUserHostedGameFormatTimes?: Dict<number>;
	lastUserHostedGameTime?: number;
	leaderboardManagers?: string[];
	miniGameCounts?: Dict<number>;
	pastGames?: IPastGame[];
	pastTournaments?: IPastTournament[];
	pastUserHostedGames?: IPastGame[];
	queuedTournament?: IQueuedTournament;
	roomSampleTeamsLink?: string;
	scriptedGameCounts?: Dict<number>;
	scriptedGameStats?: IGameStat[];
	thcWinners?: Dict<string>;
	tournamentLeaderboard?: ILeaderboard;
	tournamentManagers?: string[];
	tournamentGameBanlist?: Dict<ITournamentGameBan>;
	tournamentTrainerCards?: Dict<ITournamentTrainerCard>;
	unsortedLeaderboard?: ILeaderboard;
	userHostedGameCounts?: Dict<number>;
	userHostedGameStats?: Dict<IGameStat[]>;
	userHostedGameQueue?: IQueuedUserHostedGame[];
	userHostStatuses?: Dict<IUserHostStatusData>;
}

export interface IArchiveDatabase {
	previousCycles?: IPreviousCycle[];
}

interface IOfflineMessage {
	message: string;
	readTime: number;
	sender: string;
	sentTime: number;
	discarded?: boolean;
}

export interface IGlobalDatabase {
	lastSeen?: Dict<number>;
	loginSessionCookie?: {userid: string, cookie: string};
	offlineMessages?: Dict<{messages: IOfflineMessage[], timezone?: TimeZone}>;
}
