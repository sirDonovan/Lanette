interface IEventLink {
	description: string;
	link: string;
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

export interface IDatabase {
	eventLinks?: Dict<IEventLink>;
	lastTournamentTime?: number;
	leaderboard?: Dict<ILeaderboardEntry>;
	pastTournaments?: string[];
	queuedTournament?: {formatid: string, playerCap: number, scheduled: boolean, time: number};
	userHostedGameQueue?: IQueuedUserHostedGame[];
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
