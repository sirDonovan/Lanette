function arrayToRoomIds(array: string[]): string[] {
	return array.map(x => Tools.toRoomId(x));
}

function arrayToIds(array: string[]): string[] {
	return array.map(x => Tools.toId(x));
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

function stringArrayObjectToIds(object: Dict<string[]>): Dict<string[]> {
	for (const i in object) {
		object[i] = arrayToIds(object[i]);
	}

	return object;
}

export function load(config: typeof Config): typeof Config {
	if (global.tempConfig && config.tempConfig) {
		Object.assign(config, config.tempConfig);
	}

	if (config.developers) config.developers = config.developers.map(x => Tools.toId(x));

	if (config.roomIgnoredCommands) {
		config.roomIgnoredCommands = objectKeysToRoomId(stringArrayObjectToIds(config.roomIgnoredCommands));
	}
	if (config.rooms) config.rooms = config.rooms.map(x => Tools.toRoomId(x));
	if (config.subRooms) config.subRooms = objectKeysToRoomId(stringArrayObjectToRoomIds(config.subRooms));
	if (config.roomAliases) config.roomAliases = objectKeysToRoomId(stringObjectToRoomIds(config.roomAliases));

	if (config.allowScriptedGames) config.allowScriptedGames = arrayToRoomIds(config.allowScriptedGames);
	if (config.allowUserHostedGames) config.allowUserHostedGames = arrayToRoomIds(config.allowUserHostedGames);
	if (config.allowOneVsOneGames) config.allowOneVsOneGames = arrayToRoomIds(config.allowOneVsOneGames);
	if (config.allowGameAchievements) config.allowGameAchievements = arrayToRoomIds(config.allowGameAchievements);
	if (config.gameCategoryCooldowns) objectKeysToRoomId(config.gameCategoryCooldowns);
	if (config.gameCooldownTimers) objectKeysToRoomId(config.gameCooldownTimers);
	if (config.minigameCooldownTimers) objectKeysToRoomId(config.minigameCooldownTimers);
	if (config.maxUserHostedGameWinners) objectKeysToRoomId(config.maxUserHostedGameWinners);
	if (config.maxUserHostedGameWinners) objectKeysToRoomId(config.maxUserHostedGameWinners);
	if (config.maxQueuedUserHostedGames) objectKeysToRoomId(config.maxQueuedUserHostedGames);
	if (config.userHostCooldownTimers) objectKeysToRoomId(config.userHostCooldownTimers);
	if (config.disallowCreatingPastGames) config.disallowCreatingPastGames = arrayToRoomIds(config.disallowCreatingPastGames);
	if (config.disallowCreatingPreviousUserHostedGame) {
		config.disallowCreatingPreviousUserHostedGame = arrayToRoomIds(config.disallowCreatingPreviousUserHostedGame);
	}
	if (config.limitGamesByMode) config.limitGamesByMode = arrayToRoomIds(config.limitGamesByMode);
	if (config.limitGamesByCategory) config.limitGamesByCategory = arrayToRoomIds(config.limitGamesByCategory);
	if (config.awardedBotGreetingDurations) objectKeysToRoomId(config.awardedBotGreetingDurations);

	if (config.allowTournaments) config.allowTournaments = arrayToRoomIds(config.allowTournaments);
	if (config.rankedTournaments) config.rankedTournaments = arrayToRoomIds(config.rankedTournaments);
	if (config.rankedCustomTournaments) config.rankedCustomTournaments = arrayToRoomIds(config.rankedCustomTournaments);
	if (config.manualRankedTournaments) config.manualRankedTournaments = arrayToRoomIds(config.manualRankedTournaments);
	if (config.useDefaultUnrankedTournaments) config.useDefaultUnrankedTournaments = arrayToRoomIds(config.useDefaultUnrankedTournaments);
	if (config.unrankedTournamentFormats) {
		config.unrankedTournamentFormats = objectKeysToRoomId(stringArrayObjectToIds(config.unrankedTournamentFormats));
	}
	if (config.scheduledTournamentsMaxPlayerCap) {
		config.scheduledTournamentsMaxPlayerCap = arrayToRoomIds(config.scheduledTournamentsMaxPlayerCap);
	}
	if (config.displayTournamentFormatInfo) config.displayTournamentFormatInfo = arrayToRoomIds(config.displayTournamentFormatInfo);
	if (config.displayUnrankedTournamentResults) {
		config.displayUnrankedTournamentResults = arrayToRoomIds(config.displayUnrankedTournamentResults);
	}
	if (config.disallowTournamentScouting) config.disallowTournamentScouting = arrayToRoomIds(config.disallowTournamentScouting);
	if (config.disallowTournamentScoutingFormats) {
		config.disallowTournamentScoutingFormats = objectKeysToRoomId(stringArrayObjectToIds(config.disallowTournamentScoutingFormats));
	}
	if (config.disallowTournamentModjoin) config.disallowTournamentModjoin = arrayToRoomIds(config.disallowTournamentModjoin);
	if (config.disallowTournamentBattleLinks) config.disallowTournamentBattleLinks = arrayToRoomIds(config.disallowTournamentBattleLinks);
	if (config.disallowQueueingPastTournaments) {
		config.disallowQueueingPastTournaments = arrayToRoomIds(config.disallowQueueingPastTournaments);
	}
	if (config.tournamentAutoDQTimers) objectKeysToRoomId(config.tournamentAutoDQTimers);
	if (config.adjustTournamentCaps) config.adjustTournamentCaps = arrayToRoomIds(config.adjustTournamentCaps);
	if (config.trackTournamentBattleScores) config.trackTournamentBattleScores = arrayToRoomIds(config.trackTournamentBattleScores);
	if (config.tournamentStartTimers) objectKeysToRoomId(config.tournamentStartTimers);
	if (config.defaultTournamentPlayerCaps) objectKeysToRoomId(config.defaultTournamentPlayerCaps);
	if (config.tournamentRoomAdvertisements) {
		config.tournamentRoomAdvertisements = objectKeysToRoomId(stringArrayObjectToRoomIds(config.tournamentRoomAdvertisements));
	}
	if (config.randomTournamentTimers) objectKeysToRoomId(config.randomTournamentTimers);
	if (config.allowUserHostedTournaments) config.allowUserHostedTournaments = arrayToRoomIds(config.allowUserHostedTournaments);
	if (config.userHostedTournamentRanks) objectKeysToRoomId(config.userHostedTournamentRanks);
	if (config.gameCatalogGists) objectKeysToRoomId(config.gameCatalogGists);

	return config;
}
