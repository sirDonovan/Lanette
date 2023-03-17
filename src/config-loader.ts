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

function objectKeysToId<T>(object: Dict<T>): Dict<T> {
	for (const i in object) {
		const id = Tools.toId(i);
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

	if (config.rankedGames) config.rankedGames = arrayToRoomIds(config.rankedGames);
	if (config.allowScriptedGames) config.allowScriptedGames = arrayToRoomIds(config.allowScriptedGames);
	if (config.scriptedGameDebugLogs) config.scriptedGameDebugLogs = arrayToRoomIds(config.scriptedGameDebugLogs);
	if (config.allowUserHostedGames) config.allowUserHostedGames = arrayToRoomIds(config.allowUserHostedGames);
	if (config.allowChallengeGames) config.allowChallengeGames = arrayToRoomIds(config.allowChallengeGames);
	if (config.allowSearchChallenges) config.allowSearchChallenges = arrayToRoomIds(config.allowSearchChallenges);
	if (config.allowGameAchievements) config.allowGameAchievements = arrayToRoomIds(config.allowGameAchievements);
	if (config.tournamentGamesSubRoom) {
		config.tournamentGamesSubRoom = objectKeysToRoomId(stringObjectToRoomIds(config.tournamentGamesSubRoom));
	}
	if (config.tournamentGamesSameRoom) config.tournamentGamesSameRoom = arrayToRoomIds(config.tournamentGamesSameRoom);
	if (config.showGameTrainerCards) config.showGameTrainerCards = arrayToRoomIds(config.showGameTrainerCards);
	if (config.gameTrainerCardRequirements) objectKeysToRoomId(config.gameTrainerCardRequirements);
	if (config.showGameHostBoxes) config.showGameHostBoxes = arrayToRoomIds(config.showGameHostBoxes);
	if (config.gameHostBoxRequirements) objectKeysToRoomId(config.gameHostBoxRequirements);
	if (config.showGameScriptedBoxes) config.showGameScriptedBoxes = arrayToRoomIds(config.showGameScriptedBoxes);
	if (config.gameScriptedBoxRequirements) objectKeysToRoomId(config.gameScriptedBoxRequirements);
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
	if (config.disallowCreatingPreviousScriptedGame) {
		config.disallowCreatingPreviousScriptedGame = arrayToRoomIds(config.disallowCreatingPreviousScriptedGame);
	}
	if (config.limitGamesByMode) config.limitGamesByMode = arrayToRoomIds(config.limitGamesByMode);
	if (config.limitGamesByCategory) config.limitGamesByCategory = arrayToRoomIds(config.limitGamesByCategory);
	if (config.awardedBotGreetingDurations) objectKeysToRoomId(config.awardedBotGreetingDurations);

	if (config.allowTournaments) config.allowTournaments = arrayToRoomIds(config.allowTournaments);
	if (config.rankedTournaments) config.rankedTournaments = arrayToRoomIds(config.rankedTournaments);
	if (config.rankedCustomTournaments) config.rankedCustomTournaments = arrayToRoomIds(config.rankedCustomTournaments);
	if (config.manualRankedTournaments) config.manualRankedTournaments = arrayToRoomIds(config.manualRankedTournaments);
	if (config.useDefaultUnrankedTournaments) config.useDefaultUnrankedTournaments = arrayToRoomIds(config.useDefaultUnrankedTournaments);
	if (config.customFormatRandomTournaments) config.customFormatRandomTournaments = arrayToRoomIds(config.customFormatRandomTournaments);
	if (config.unrankedTournamentFormats) {
		config.unrankedTournamentFormats = objectKeysToRoomId(stringArrayObjectToIds(config.unrankedTournamentFormats));
	}
	if (config.randomTournamentCustomRules) {
		config.randomTournamentCustomRules = objectKeysToRoomId(stringArrayObjectToIds(config.randomTournamentCustomRules));
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
	if (config.tournamentRandomAutoDQTimers) objectKeysToRoomId(config.tournamentRandomAutoDQTimers);
	if (config.adjustTournamentCaps) config.adjustTournamentCaps = arrayToRoomIds(config.adjustTournamentCaps);
	if (config.trackTournamentBattleScores) config.trackTournamentBattleScores = arrayToRoomIds(config.trackTournamentBattleScores);
	if (config.tournamentStartTimers) objectKeysToRoomId(config.tournamentStartTimers);
	if (config.defaultTournamentPlayerCaps) objectKeysToRoomId(config.defaultTournamentPlayerCaps);
	if (config.tournamentRoomAdvertisements) {
		config.tournamentRoomAdvertisements = objectKeysToRoomId(stringArrayObjectToRoomIds(config.tournamentRoomAdvertisements));
	}
	if (config.tournamentGameRoomAdvertisements) {
		config.tournamentGameRoomAdvertisements = objectKeysToRoomId(stringArrayObjectToRoomIds(config.tournamentGameRoomAdvertisements));
	}
	if (config.randomTournamentTimers) objectKeysToRoomId(config.randomTournamentTimers);
	if (config.tournamentRules) objectKeysToRoomId(config.tournamentRules);
	if (config.allowUserHostedTournaments) config.allowUserHostedTournaments = arrayToRoomIds(config.allowUserHostedTournaments);
	if (config.showTournamentTrainerCards) config.showTournamentTrainerCards = arrayToRoomIds(config.showTournamentTrainerCards);
	if (config.sharedTournamentTrainerCards) {
		config.sharedTournamentTrainerCards = objectKeysToRoomId(stringObjectToRoomIds(config.sharedTournamentTrainerCards));
	}
	if (config.enabledTournamentTrainerCardRibbons) {
		config.enabledTournamentTrainerCardRibbons = objectKeysToRoomId(stringArrayObjectToIds(config.enabledTournamentTrainerCardRibbons));
	}
	if (config.tournamentTrainerCardBadges) config.tournamentTrainerCardBadges = objectKeysToId(config.tournamentTrainerCardBadges);
	if (config.tournamentPointsShop) config.tournamentPointsShop = arrayToRoomIds(config.tournamentPointsShop);
	if (config.tournamentTrainerCardRibbons) config.tournamentTrainerCardRibbons = objectKeysToId(config.tournamentTrainerCardRibbons);
	if (config.tournamentPointsShopRibbons) objectKeysToRoomId(config.tournamentPointsShopRibbons);
	if (config.userHostedTournamentRanks) objectKeysToRoomId(config.userHostedTournamentRanks);
	if (config.gameCatalogGists) objectKeysToRoomId(config.gameCatalogGists);

	return config;
}
