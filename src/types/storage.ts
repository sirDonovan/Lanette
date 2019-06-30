interface ILeaderboardEntry {
	annual: number;
	annualSources: Dict<number>;
	current: number;
	name: string;
	sources: Dict<number>;
}

interface IOfflineMessage {
	message: string;
	readTime: number;
	sender: string;
	sentTime: number;
	expired?: boolean;
}

export interface IDatabase {
	lastTournamentTime?: number;
	leaderboard?: Dict<ILeaderboardEntry>;
	offlineMessages?: Dict<IOfflineMessage[]>;
	queuedTournament?: {formatid: string, playerCap: number, scheduled: boolean, time: number};
}
