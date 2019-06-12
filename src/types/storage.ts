interface ILeaderboardEntry {
	annual: number;
	annualSources: Dict<number>;
	current: number;
	name: string;
	sources: Dict<number>;
}

export interface IDatabase {
	lastTournamentTime?: number;
	leaderboard?: Dict<ILeaderboardEntry>;
	queuedTournament?: {formatid: string, playerCap: number, scheduled: boolean, time: number};
}
