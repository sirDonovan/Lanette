function arrayToRoomIds(array: string[]): string[] {
	return array.map(x => Tools.toRoomId(x));
}

function objectKeysToRoomId<T>(object: Dict<T>): Dict<T> {
	for (const i in object) {
		const id = Tools.toRoomId(i);
		if (id !== i) {
			object[id] = object[i];
			delete object[i];
		}
	}

	return object;
}

function stringObjectToRoomIds(object: Dict<string>): Dict<string> {
	for (const i in object) {
		object[i] = Tools.toRoomId(object[i]);
	}

	return object;
}

function stringArrayObjectToRoomIds(object: Dict<string[]>): Dict<string[]> {
	for (const i in object) {
		object[i] = arrayToRoomIds(object[i]);
	}

	return object;
}

export function load(config: typeof Config): typeof Config {
	if (global.tempConfig && config.tempConfig) {
		Object.assign(config, config.tempConfig);
	}

	if (config.developers) config.developers = config.developers.map(x => Tools.toId(x));

	if (config.rooms) config.rooms = config.rooms.map(x => Tools.toRoomId(x));
	if (config.disallowChatLogging) config.disallowChatLogging = arrayToRoomIds(config.disallowChatLogging);
	if (config.roomAliases) config.roomAliases = objectKeysToRoomId(stringObjectToRoomIds(config.roomAliases));

	if (config.allowScriptedGames) config.allowScriptedGames = arrayToRoomIds(config.allowScriptedGames);
	if (config.allowUserHostedGames) config.allowUserHostedGames = arrayToRoomIds(config.allowUserHostedGames);
	if (config.gameCooldownTimers) objectKeysToRoomId(config.gameCooldownTimers);
	if (config.maxUserHostedGameWinners) objectKeysToRoomId(config.maxUserHostedGameWinners);
	if (config.maxUserHostedGameWinners) objectKeysToRoomId(config.maxUserHostedGameWinners);
	if (config.maxQueuedUserHostedGames) objectKeysToRoomId(config.maxQueuedUserHostedGames);
	if (config.awardedBotGreetingDurations) objectKeysToRoomId(config.awardedBotGreetingDurations);

	if (config.allowTournaments) config.allowTournaments = arrayToRoomIds(config.allowTournaments);
	if (config.rankedTournaments) config.rankedTournaments = arrayToRoomIds(config.rankedTournaments);
	if (config.rankedCustomTournaments) config.rankedCustomTournaments = arrayToRoomIds(config.rankedCustomTournaments);
	if (config.useDefaultUnrankedTournaments) config.useDefaultUnrankedTournaments = arrayToRoomIds(config.useDefaultUnrankedTournaments);
	if (config.scheduledTournamentsMaxPlayerCap) config.scheduledTournamentsMaxPlayerCap = arrayToRoomIds(config.scheduledTournamentsMaxPlayerCap);
	if (config.displayTournamentFormatInfo) config.displayTournamentFormatInfo = arrayToRoomIds(config.displayTournamentFormatInfo);
	if (config.disallowTournamentScouting) config.disallowTournamentScouting = arrayToRoomIds(config.disallowTournamentScouting);
	if (config.disallowTournamentModjoin) config.disallowTournamentModjoin = arrayToRoomIds(config.disallowTournamentModjoin);
	if (config.disallowTournamentBattleLinks) config.disallowTournamentBattleLinks = arrayToRoomIds(config.disallowTournamentBattleLinks);
	if (config.tournamentAutoDQTimers) objectKeysToRoomId(config.tournamentAutoDQTimers);
	if (config.adjustTournamentCaps) config.adjustTournamentCaps = arrayToRoomIds(config.adjustTournamentCaps);
	if (config.trackTournamentBattleScores) config.trackTournamentBattleScores = arrayToRoomIds(config.trackTournamentBattleScores);
	if (config.tournamentStartTimers) objectKeysToRoomId(config.tournamentStartTimers);
	if (config.defaultTournamentPlayerCaps) objectKeysToRoomId(config.defaultTournamentPlayerCaps);
	if (config.tournamentRoomAdvertisements) config.tournamentRoomAdvertisements = stringArrayObjectToRoomIds(config.tournamentRoomAdvertisements);
	if (config.randomTournamentTimers) objectKeysToRoomId(config.randomTournamentTimers);
	if (config.allowUserHostedTournaments) config.allowUserHostedTournaments = arrayToRoomIds(config.allowUserHostedTournaments);
	if (config.userHostedTournamentRanks) objectKeysToRoomId(config.userHostedTournamentRanks);

	return config;
}
