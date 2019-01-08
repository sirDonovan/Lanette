interface ILeaderboardEntry {
	annual: number;
	annualSources: Dict<number>;
	current: number;
	name: string;
	sources: Dict<number>;
}

export interface IDatabase {
	leaderboard?: Dict<ILeaderboardEntry>;
}
