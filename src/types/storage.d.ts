import type { HexCode } from "./tools";

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

export interface IUserHostedGameStats {
	endTime: number;
	format: string;
	inputTarget: string;
	playerCount: number;
	startTime: number;
}

export interface IGameTrainerCard {
	avatar: string;
	pokemon: string[];
	background?: HexCode;
	pokemonGifs?: boolean;
}

export interface IGameHostBox {
	pokemon: string[];
	shinyPokemon: boolean[];
	background?: HexCode;
	buttons?: HexCode;
}

export type UserHostStatus = 'unapproved' | 'novice' | 'approved';

export type LeaderboardType = 'gameLeaderboard' | 'gameHostingLeaderbaord' | 'tournamentLeaderboard' | 'unsortedLeaderboard';

export interface ILeaderboard {
	entries: Dict<ILeaderboardEntry>;
	sources: string[];
	type: LeaderboardType;
}

export interface ICachedLeaderboardEntry {
	id: string;
	points: number;
}

export interface IDatabase {
	botGreetings?: Dict<IBotGreeting>;
	eventInformation?: Dict<IEventInformation>;
	gameAchievements?: Dict<string[]>;
	gameLeaderboard?: ILeaderboard;
	gameHostingLeaderbaord?: ILeaderboard;
	gameHostBoxes?: Dict<IGameHostBox>;
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
	previousUserHostedGameStats?: Dict<IUserHostedGameStats[]>;
	queuedTournament?: {formatid: string; playerCap: number; scheduled: boolean; time: number};
	roomSampleTeamsLink?: string;
	scriptedGameCounts?: Dict<number>;
	thcWinners?: Dict<string>;
	tournamentLeaderboard?: ILeaderboard;
	unsortedLeaderboard?: ILeaderboard;
	userHostedGameCounts?: Dict<number>;
	userHostedGameStats?: Dict<IUserHostedGameStats[]>;
	userHostedGameQueue?: IQueuedUserHostedGame[];
	userHostStatuses?: Dict<UserHostStatus>;
}

interface IOfflineMessage {
	message: string;
	readTime: number;
	sender: string;
	sentTime: number;
	expired?: boolean;
}

export interface IGlobalDatabase {
	lastSeen?: Dict<number>;
	offlineMessages?: Dict<IOfflineMessage[]>;
}
