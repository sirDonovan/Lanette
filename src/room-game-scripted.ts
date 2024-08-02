import path = require('path');

import type { GamePageBase } from './html-pages/activity-pages/game-page-base';
import type { PRNGSeed } from "./lib/prng";
import { PRNG } from "./lib/prng";
import type { Player } from "./room-activity";
import { Game } from "./room-game";
import type { Room } from "./rooms";
import type {
	DefaultGameOption, GameChallenge, GameCommandListener, GameCommandReturnType, IBattleGameData, IGameAchievement,
	IGameCommandCountListener, IGameCommandCountOptions, IGameFormat, IGameInputProperties, IGameMode, IGameOptions,
	IGameNumberOptionValues, IGameVariant, IRandomGameAnswer, LoadedGameCommands, PlayerList
} from "./types/games";
import type { GameActionLocations } from "./types/storage";
import type { IClientTournamentData } from "./types/tournaments";
import type { User } from "./users";

const AUTO_START_VOTE_TIME = 5 * 1000;
const MIN_BOT_CHALLENGE_SPEED = 1;

// base of 0 defaults option to 'off'
const defaultOptionValues: KeyedDict<DefaultGameOption, IGameNumberOptionValues> = {
	points: {min: 10, base: 10, max: 10},
	teams: {min: 2, base: 2, max: 4},
	cards: {min: 4, base: 5, max: 6},
	freejoin: {min: 1, base: 0, max: 1},
};

export class ScriptedGame extends Game {
	readonly commands = Object.assign(Object.create(null), Games.getSharedCommands()) as LoadedGameCommands;
	readonly commandsListeners: IGameCommandCountListener[] = [];
	currentPlayer: Player | null = null;
	debugLogs: string[] = [];
	debugLogWriteCount: number = 0;
	enabledAssistActions = new Map<Player, boolean>();
	gameActionLocations = new Map<Player, GameActionLocations>();
	htmlPages = new Map<Player, GamePageBase>();
	inactiveRounds: number = 0;
	inheritedPlayers: boolean = false;
	internalGame: boolean = false;
	lateJoinQueue: Player[] = [];
	readonly loserPointsToBits: number = 10;
	managedPlayers: boolean = false;
	readonly maxBits: number = 500;
	notifyRankSignups: boolean = false;
	parentGame: ScriptedGame | undefined = undefined;
	signupsBumped: boolean = false;
	startTime: number = 0;
	usesHtmlPage: boolean = false;
	usesTournamentStart: boolean = false;
	usesTournamentJoin: boolean = false;
	usesWorkers: boolean = false;
	readonly winnerPointsToBits: number = 50;

	debugLogsEnabled: boolean;

	// set in onInitialize()
	declare format: IGameFormat;
	actionsUhtmlName!: string;

	allowChildGameBits?: boolean;
	readonly battleRooms?: string[];
	botChallengeSpeeds: number[] | null = null;
	botTurnTimeout?: NodeJS.Timeout;
	canLateJoin?: boolean;
	challengeRoundTimes: number[] | null = null;
	dontAutoCloseHtmlPages?: boolean;
	isMiniGame?: boolean;
	lateJoinQueueSize?: number;
	readonly lives?: Map<Player, number>;
	maxRound?: number;
	noForceEndMessage?: boolean;
	playerInactiveRoundLimit?: number;
	queueLateJoins?: boolean;
	requiresAutoconfirmed?: boolean;
	roundTime?: number;
	shinyMascot?: boolean;
	startingLives?: number;
	subGameNumber?: number;
	timeLimit?: number;

	constructor(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed) {
		super(room, pmRoom, initialSeed);

		this.debugLogsEnabled = Config.scriptedGameDebugLogs && Config.scriptedGameDebugLogs.includes(room.id) ? true : false;
		if (this.debugLogsEnabled) {
			const date = new Date();
			this.debugLogs.push(date.toUTCString() + " (" + date.toTimeString() + ")");
		}
	}

	static resolveInputProperties<T extends ScriptedGame>(format: IGameFormat<T>, mode: IGameMode | undefined,
		variant: IGameVariant | undefined): IGameInputProperties {
		const customizableNumberOptions = Object.assign({}, format.customizableNumberOptions);
		let defaultOptions = format.defaultOptions;
		let description: string | undefined;
		const namePrefixes: string[] = [];
		const nameSuffixes: string[] = [];

		if (format.freejoin || (variant && variant.freejoin)) {
			customizableNumberOptions.freejoin = {
				min: 1,
				base: 1,
				max: 1,
			};
		}

		if (mode) {
			const modeInputProperties = mode.class.resolveInputProperties(format, customizableNumberOptions);
			if (modeInputProperties.customizableNumberOptions) {
				Object.assign(customizableNumberOptions, modeInputProperties.customizableNumberOptions);
			}

			if (modeInputProperties.defaultOptions) defaultOptions = modeInputProperties.defaultOptions;
			if (modeInputProperties.description) description = modeInputProperties.description;

			if (modeInputProperties.namePrefixes) {
				for (const prefix of modeInputProperties.namePrefixes) {
					namePrefixes.push(prefix);
				}
			}

			if (modeInputProperties.nameSuffixes) {
				for (const suffix of modeInputProperties.nameSuffixes) {
					nameSuffixes.push(suffix);
				}
			}
		}

		for (const defaultOption of defaultOptions) {
			if (defaultOption in customizableNumberOptions) continue;

			let base: number;
			if (defaultOptionValues[defaultOption].base === 0) {
				base = 0;
			} else {
				base = defaultOptionValues[defaultOption].base || 5;
			}

			customizableNumberOptions[defaultOption] = {
				min: defaultOptionValues[defaultOption].min || 1,
				base,
				max: defaultOptionValues[defaultOption].max || 10,
			};
		}

		const options: IGameOptions = {};
		for (const i in customizableNumberOptions) {
			options[i] = customizableNumberOptions[i].base;
		}

		const customizedNumberOptions: Dict<number> = {};
		for (const i in format.inputOptions) {
			if (!(i in customizableNumberOptions)) {
				if (i !== 'freejoin') options[i] = format.inputOptions[i];
				continue;
			}

			let optionValue = format.inputOptions[i] as number;
			if (optionValue < customizableNumberOptions[i].min) {
				optionValue = customizableNumberOptions[i].min;
			} else if (optionValue > customizableNumberOptions[i].max) {
				optionValue = customizableNumberOptions[i].max;
			}

			options[i] = optionValue;

			if (!format.freejoin || optionValue !== customizableNumberOptions[i].base) {
				customizedNumberOptions[i] = optionValue;
			}
		}

		if (customizedNumberOptions.points) nameSuffixes.push("(first to " + customizedNumberOptions.points + ")");
		if (customizedNumberOptions.teams) namePrefixes.unshift('' + customizedNumberOptions.teams);
		if (customizedNumberOptions.cards) namePrefixes.unshift(customizedNumberOptions.cards + "-card");
		if (customizedNumberOptions.gen) namePrefixes.unshift('Gen ' + customizedNumberOptions.gen);
		if (customizedNumberOptions.ports) namePrefixes.unshift(customizedNumberOptions.ports + '-port');
		if (customizedNumberOptions.params) namePrefixes.unshift(customizedNumberOptions.params + '-param');
		if (customizedNumberOptions.names) namePrefixes.unshift(customizedNumberOptions.names + '-name');
		if (customizedNumberOptions.operands) namePrefixes.unshift(customizedNumberOptions.operands + '-operand');
		if (customizedNumberOptions.freejoin && !format.freejoin) nameSuffixes.push("(freejoin)");

		let nameWithOptions = '';
		if (namePrefixes.length) nameWithOptions = namePrefixes.join(" ") + " ";
		if (variant && variant.name) {
			nameWithOptions += variant.name;
		} else {
			nameWithOptions += format.name;
		}
		if (nameSuffixes.length) nameWithOptions += " " + nameSuffixes.join(" ");

		format.nameWithOptions = nameWithOptions;

		return {
			customizableNumberOptions,
			description,
			options,
		};
	}

	loadChallengeOptions(challenge: GameChallenge, options: Dict<string>): void {
		if (challenge === 'botchallenge') {
			const challengeSettings = this.format.challengeSettings!.botchallenge!;
			if (challengeSettings.points) this.options.points = challengeSettings.points;
			if (challengeSettings.options && challengeSettings.options.includes('speed') && this.roundTime) {
				let speed = parseFloat(options.speed);
				if (isNaN(speed)) {
					speed = this.roundTime;
				} else {
					if (speed < MIN_BOT_CHALLENGE_SPEED) speed = MIN_BOT_CHALLENGE_SPEED;
					speed = Math.floor(speed * 1000);
				}

				if (speed >= this.roundTime) {
					speed = this.roundTime;
					this.roundTime += 300 + (Client.getSendThrottle() * 2);
				}

				this.say("I will be playing at an average speed of " + Tools.toDurationString(speed, {milliseconds: true}) + "!");

				this.botChallengeSpeeds = [speed - 300, speed - 200, speed - 100, speed, speed + 100, speed + 200, speed + 300];
			}
		} else if (challenge === 'onevsone') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			const challengeSettings = this.format.challengeSettings!.onevsone!;
			if (challengeSettings.points) this.options.points = challengeSettings.points;
			if (challengeSettings.options && challengeSettings.options.includes('speed') && this.roundTime && options.speed) {
				let speed = parseFloat(options.speed);
				if (isNaN(speed)) {
					speed = this.roundTime;
				} else {
					if (speed < MIN_BOT_CHALLENGE_SPEED) speed = MIN_BOT_CHALLENGE_SPEED;
					speed = Math.floor(speed * 1000);
				}

				if (speed >= this.roundTime) {
					speed = this.roundTime;
					this.roundTime += 400;
				}

				this.say("Rounds will last an average time of " + Tools.toDurationString(speed, {milliseconds: true}) + "!");

				this.challengeRoundTimes = [speed - 300, speed - 200, speed - 100, speed, speed + 100, speed + 200, speed + 300];
			}
		}
	}

	setBotTurnTimeout(callback: () => void, time: number): void {
		if (this.botTurnTimeout) clearTimeout(this.botTurnTimeout);

		this.botTurnTimeout = setTimeout(() => {
			if (this.ended) return;

			callback();
		}, time);
	}

	getDebugLogPath(filename?: string): string {
		if (!filename) filename = Tools.toId(this.uhtmlBaseName) + (this.debugLogWriteCount ? "-" + this.debugLogWriteCount : "");
		return path.join(Tools.rootFolder, Tools.runtimeOutputRootFolder, Tools.runtimeOutputGameDebug,
			Tools.getDateFilename() + "-" + this.room.id + "-" + filename + ".txt");
	}

	debugLog(log: string): void {
		if (this.debugLogsEnabled) this.debugLogs.push(new Date().toTimeString() + ": " + log);
	}

	writeDebugLog(): void {
		if (this.debugLogs.length) {
			void Tools.safeWriteFile(this.getDebugLogPath(), this.debugLogs.join("\n\n"))
				.catch((e: Error) => console.log("Error exporting game debug log: " + e.message));
		}

		this.debugLogWriteCount++;
	}

	setUhtmlBaseName(): void {
		let gameCount: number;
		if (this.isPmActivity(this.room)) {
			gameCount = this.random(100);
		} else {
			let databaseKey: 'miniGameCounts' | 'scriptedGameCounts';
			if (this.isMiniGame) {
				databaseKey = 'miniGameCounts';
			} else {
				databaseKey = 'scriptedGameCounts';
			}

			const database = Storage.getDatabase(this.room);
			if (!database[databaseKey]) database[databaseKey] = {};
			if (!(this.format.id in database[databaseKey]!)) database[databaseKey]![this.format.id] = 0;
			database[databaseKey]![this.format.id]++;
			gameCount = database[databaseKey]![this.format.id];
		}

		this.uhtmlBaseName = (this.isMiniGame ? "mini" : "scripted") + "-" + this.format.id + "-" + gameCount;
		this.signupsUhtmlName = this.uhtmlBaseName + "-signups";
		this.joinLeaveButtonUhtmlName = this.uhtmlBaseName + "-join-leave";
		this.joinLeaveButtonBumpUhtmlName = this.uhtmlBaseName + "-join-leave-update";
		this.privateJoinLeaveUhtmlName = this.uhtmlBaseName + "-private-join-leave";
	}

	onInitialize(): boolean {
		if (this.format.variant) {
			Object.assign(this, this.format.variant);
		}

		if (this.format.mode && this.format.modeProperties && this.format.mode.id in this.format.modeProperties) {
			Object.assign(this, this.format.modeProperties[this.format.mode.id]);
		}

		if (this.validateInputProperties && !this.validateInputProperties(this.format.resolvedInputProperties)) {
			return false;
		}

		this.options = this.format.resolvedInputProperties.options;

		this.baseHtmlPageId = this.room.id + "-" + this.format.id;
		this.setUhtmlBaseName();
		this.actionsUhtmlName = this.uhtmlBaseName + "-actions";

		if (this.format.commands) Object.assign(this.commands, this.format.commands);

		const mascot = Games.getFormatMascot(this.format);
		if (mascot) this.mascot = mascot;

		if (this.format.mode) {
			this.format.mode.initialize(this);
		}

		let htmlPageHeader = "<h2>";
		if (this.mascot) htmlPageHeader += Dex.getPokemonIcon(this.mascot);
		htmlPageHeader += (this.format.nameWithOptions || this.format.name) + "</h2>";
		this.htmlPageHeader = htmlPageHeader;

		if (Config.scriptedGameDebugStats) Tools.appendFile(this.getDebugLogPath("stats"), "\n" + this.format.nameWithOptions + " created");

		return true;
	}

	loadModeCommands<T extends ScriptedGame>(commands: LoadedGameCommands<T>): void {
		for (const command in commands) {
			const commandsToOverwrite: string[] = [command];
			if (command in this.commands) {
				for (const i in this.commands) {
					if (i === command) continue;
					if (this.commands[i].command === this.commands[command].command) {
						commandsToOverwrite.push(i);
					}
				}
			}

			for (const i of commandsToOverwrite) {
				// @ts-expect-error
				this.commands[i] = commands[command];
			}
		}
	}

	getMascotIcons(): string {
		return this.mascot ? Dex.getPokemonIcon(this.mascot) : '';
	}

	getMascotAndNameHtml(additionalText?: string, noDescription?: boolean): string {
		let minigameDescription: string | undefined;
		if (this.isMiniGame && !noDescription) {
			minigameDescription = this.getMinigameDescription();
		}

		return this.getMascotIcons() + "<b>" + (this.isMiniGame ? "Mini " : "") + this.name + (additionalText || "") + "</b>" +
			(minigameDescription ? "<br />" + minigameDescription : "");
	}

	getDescriptionHtml(): string {
		let description = this.getDescription();
		if (this.format.additionalDescription) description += "<br /><br />" + this.format.additionalDescription;

		let commandDescriptions: string[] = [];
		if (this.getPlayerSummary) commandDescriptions.push(Config.commandCharacter + "summary");
		if (this.format.commandDescriptions) commandDescriptions = commandDescriptions.concat(this.format.commandDescriptions);
		if (commandDescriptions.length) {
			description += "<br /><b>Command" + (commandDescriptions.length > 1 ? "s" : "") + "</b>: " +
				commandDescriptions.map(x => "<code>" + x + "</code>").join(", ");
		}

		if (this.format.voter) {
			const id = Tools.toId(this.format.voter);
			const database = Storage.getDatabase(this.room as Room);
			if (database.gameFormatScriptedBoxes && id in database.gameFormatScriptedBoxes &&
				this.format.id in database.gameFormatScriptedBoxes[id]) {
				this.customBox = database.gameFormatScriptedBoxes[id][this.format.id];
			} else if (database.gameScriptedBoxes && id in database.gameScriptedBoxes) {
				this.customBox = database.gameScriptedBoxes[id];
			}
		}

		return Games.getScriptedBoxHtml(this.room as Room, this.name, this.format.id, this.format.voter, description, this.mascot,
			this.shinyMascot, !this.internalGame && !this.parentGame ? this.getHighlightPhrase() : "",
			this.format.mode ? this.getModeHighlightPhrase() : "");
	}

	getSignupsDescriptionHtml(): string {
		if (this.mascot) {
			if (this.shinyMascot === undefined) {
				if (this.rollForShinyPokemon()) {
					this.shinyMascot = true;
				} else {
					this.shinyMascot = false;
				}
			}
		}

		return this.getDescriptionHtml();
	}

	getMinigameDescription(): string | undefined {
		return this.format.minigameDescription;
	}

	inactivityEnd(): void {
		this.say("Ending the game due to a lack of players.");
		if (!this.parentGame && !this.internalGame) {
			Games.banFromNextVote(this.room as Room, this.format);
			Games.setAutoCreateTimer(this.room as Room, 'scripted', AUTO_START_VOTE_TIME);
		}
		this.deallocate(false);
	}

	errorEnd(): void {
		this.say("Ending the game due to an error.");
		Games.disableFormat(this.format);
		this.deallocate(false);
	}

	getHighlightPhrase(): string {
		return Games.getScriptedGameHighlight() + " " + this.id;
	}

	getModeHighlightPhrase(): string {
		if (!this.format.mode) return "";
		return Games.getScriptedGameHighlight() + " " + this.format.mode.id;
	}

	async signups(): Promise<void> {
		this.signupsTime = Date.now();
		this.signupsStarted = true;

		if (!this.isMiniGame && !this.internalGame) {
			this.showSignupsHtml = true;
			this.sayUhtml(this.uhtmlBaseName + "-description", this.getSignupsDescriptionHtml());

			if (!this.options.freejoin) {
				this.sayUhtml(this.signupsUhtmlName, this.getSignupsPlayersHtml());
				this.signupsUpdateInterval = setInterval(() => {
					this.sayUhtmlChange(this.signupsUhtmlName, this.getSignupsPlayersHtml());
				}, 1000);
			}

			this.sayUhtml(this.joinLeaveButtonUhtmlName, "<center>" + this.getJoinButtonHtml() + "</center>");

			this.notifyRankSignups = true;
			const room = this.room as Room;
			room.notifyRank("all", room.title + " scripted game", this.name, this.getHighlightPhrase());
			if (this.format.mode) {
				room.notifyRank("all", room.title + " scripted game", this.name, this.getModeHighlightPhrase());
			}
		}

		if (this.shinyMascot) this.say(this.mascot!.name + " is shiny so bits will be doubled!");

		if (this.onSignups) {
			try {
				await this.onSignups();
			} catch (e) {
				console.log(e);
				Tools.logException(e as NodeJS.ErrnoException, this.name + " onSignups()");
				this.errorEnd();
				return;
			}
		}

		if (this.options.freejoin) {
			this.started = true;
			this.startTime = Date.now();
		} else if (!this.internalGame && !this.isMiniGame) {
			if (Config.gameAutoStartTimers && this.room.id in Config.gameAutoStartTimers) {
				const startTimer = (Config.gameAutoStartTimers[this.room.id] * 60 * 1000) / 2;
				this.startTimer = setTimeout(() => {
					this.signupsBumped = true;
					this.sayUhtml(this.signupsUhtmlName, this.getSignupsPlayersHtml());
					this.sayUhtml(this.joinLeaveButtonBumpUhtmlName, "<center>" + this.getJoinButtonHtml() + "</center>");

					this.startTimer = setTimeout(() => {
						void (async() => {
							if (!await this.start()) {
								this.startTimer = setTimeout(() => {
									void (async() => {
										if (!await this.start()) {
											this.inactivityEnd();
										}
									})();
								}, startTimer);
							}
						})();
					}, startTimer);
				}, startTimer);
			}
		}

		if (this.isMiniGame && !this.internalGame) {
			await this.nextRound();
		}
	}

	async start(tournamentStart?: boolean): Promise<boolean> {
		if (this.started || (this.minPlayers && this.playerCount < this.minPlayers) ||
			(this.usesTournamentStart && !tournamentStart)) return false;

		if (this.signupsUpdateInterval) clearInterval(this.signupsUpdateInterval);
		if (this.startTimer) clearTimeout(this.startTimer);
		this.started = true;
		this.startTime = Date.now();

		this.joinNotices.clear();
		this.leaveNotices.clear();
		if (this.notifyRankSignups) (this.room as Room).notifyOffRank("all");

		if (this.showSignupsHtml) {
			this.sayUhtmlChange(this.signupsUhtmlName, this.getSignupsPlayersHtml());

			const signupsEndMessage = this.getSignupsEndMessage();
			if (this.signupsBumped) {
				this.sayUhtmlChange(this.joinLeaveButtonUhtmlName, "<div></div>");
				this.sayUhtmlChange(this.joinLeaveButtonBumpUhtmlName, signupsEndMessage);
			} else {
				this.sayUhtmlChange(this.joinLeaveButtonUhtmlName, signupsEndMessage);
			}
		}

		if (!this.internalGame) {
			for (const i in this.players) {
				this.players[i].sendRoomHighlight(this.name + " is starting!");
			}
		}

		if (this.onStart) {
			try {
				await this.onStart();
			} catch (e) {
				console.log(e);
				Tools.logException(e as NodeJS.ErrnoException, this.name + " onStart()");
				this.errorEnd();
			}
		} else {
			await this.nextRound();
		}

		return true;
	}

	async nextRound(): Promise<void> {
		if (this.ended) throw new Error("nextRound() called after game ended");
		if (this.timeout) clearTimeout(this.timeout);

		// @ts-expect-error
		this.round++;
		if (this.maxRound && this.round > this.maxRound) {
			if (this.onMaxRound) {
				try {
					this.onMaxRound();
				} catch (e) {
					console.log(e);
					Tools.logException(e as NodeJS.ErrnoException, this.name + " onMaxRound()");
					this.errorEnd();
				}
			}
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!this.ended) this.end();
			return;
		}

		if (this.timeLimit && (Date.now() - this.startTime) >= this.timeLimit) {
			let timeEnded = false;
			if (this.onTimeLimit) {
				try {
					if (this.onTimeLimit()) timeEnded = true;
				} catch (e) {
					console.log(e);
					Tools.logException(e as NodeJS.ErrnoException, this.name + " onTimeLimit()");
					this.errorEnd();
					return;
				}
			} else {
				timeEnded = true;
			}

			if (timeEnded) {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (!this.ended) {
					this.say("The game has reached the time limit!");
					this.end();
				}
				return;
			}
		}

		if (this.onNextRound) {
			try {
				await this.onNextRound();
			} catch (e) {
				console.log(e);
				Tools.logException(e as NodeJS.ErrnoException, this.name + " onNextRound()");
				this.errorEnd();
			}
		}
	}

	getDisplayedRoundNumber(): number {
		return this.round;
	}

	getRoundTime(): number {
		if (this.roundTime === undefined) throw new Error("getRoundTime() called without a roundTime configured");

		if (this.challengeRoundTimes) return this.sampleOne(this.challengeRoundTimes);

		return this.roundTime;
	}

	getRoundHtml(getAttributes: (players: PlayerList) => string, players?: PlayerList | null, roundText?: string,
		attributeText?: string): string {
		let additionalSpanText = '';
		if (this.subGameNumber) additionalSpanText += " - Game " + this.subGameNumber;
		additionalSpanText += "&nbsp;-&nbsp;" + (roundText || "Round " + this.getDisplayedRoundNumber());

		if (!players) players = this.getRemainingPlayers();
		const attributes = getAttributes.call(this, players);

		if (!attributeText) {
			const remainingPlayerCount = this.getRemainingPlayerCount(players);
			if (remainingPlayerCount > 0) {
				attributeText = "<b>" + (!this.options.freejoin ? "Remaining players" : "Players") + " (" + remainingPlayerCount +
					")</b>";
			}
		}

		let html = this.getMascotAndNameHtml(additionalSpanText);
		if (this.started && !this.options.freejoin && this.canLateJoin && (!this.playerCap || this.playerCount < this.playerCap)) {
			html += "&nbsp;-&nbsp;" + this.getLateJoinButtonHtml();
		}
		html += "<br />&nbsp;";

		let additionalText = "";
		if (attributes || attributeText) {
			additionalText += "<br />" + (attributeText ? attributeText : "") + (attributes ? (attributeText ? ": " : "") +
				attributes : "");
		}

		return this.getCustomBoxDiv(html, undefined, additionalText);
	}

	end(): void {
		if (this.ended) throw new Error("Game already ended");
		this.ended = true;

		if (this.timeout) clearTimeout(this.timeout);

		if (this.isPmActivity(this.room)) {
			this.deallocate(false);
			return;
		}

		if (this.onEnd) {
			try {
				this.onEnd();
			} catch (e) {
				console.log(e);
				Tools.logException(e as NodeJS.ErrnoException, this.name + " onEnd()");
				this.errorEnd();
				return;
			}
		}

		const now = Date.now();

		if (this.isMiniGame) {
			Games.setLastMinigame(this.room, now);
		} else if (!this.parentGame && !this.internalGame) {
			Games.clearNextVoteBans(this.room);

			this.updatedDatabase = true;
			const database = Storage.getDatabase(this.room);

			Games.setLastGame(this.room, now);
			Games.setLastScriptedGame(this.room, now);
			Games.setLastWinners(this.room, Array.from(this.winners.keys()).map(x => x.name));
			database.lastGameTime = now;

			if (!database.lastGameFormatTimes) database.lastGameFormatTimes = {};
			database.lastGameFormatTimes[this.format.id] = now;
			const idWithOptions = Tools.toId(this.format.nameWithOptions);
			if (idWithOptions !== this.format.id) {
				database.lastGameFormatTimes[idWithOptions] = now;
			}

			if (!database.pastGames) database.pastGames = [];
			database.pastGames.unshift({inputTarget: this.format.inputTarget, name: this.name, time: now});
			while (database.pastGames.length > 8) {
				database.pastGames.pop();
			}

			if (!database.scriptedGameStats) database.scriptedGameStats = [];
			database.scriptedGameStats.push({
				endTime: now,
				format: this.format.name,
				inputTarget: this.format.inputTarget,
				startingPlayerCount: this.playerCount,
				endingPlayerCount: this.getRemainingPlayerCount(),
				startTime: this.signupsTime,
				winners: Array.from(this.winners.keys()).map(x => x.id),
			});

			this.setCooldownAndAutoCreate('userhosted', now - this.startTime);
		}

		Games.setNextScheduledGame(this.room);

		this.deallocate(false);
	}

	forceEnd(user: User, reason?: string): void {
		if (!this.noForceEndMessage) {
			const forceEndMessage = this.getForceEndMessage ? this.getForceEndMessage() : "";
			this.say("The " + this.name + " " + this.activityType + " was forcibly ended!" + (forceEndMessage ? " " +
				forceEndMessage : ""));
		}

		if (this.onForceEnd) {
			try {
				this.onForceEnd(user, reason);
			} catch (e) {
				console.log(e);
				Tools.logException(e as NodeJS.ErrnoException, this.name + " onForceEnd()");
			}
		}

		this.ended = true;
		this.deallocate(true);
	}

	cleanupTimers(): void {
		super.cleanupTimers();

		if (this.botTurnTimeout) {
			clearTimeout(this.botTurnTimeout);
			this.botTurnTimeout = undefined;
		}

		if (this.signupsUpdateInterval) {
			clearInterval(this.signupsUpdateInterval);
			this.signupsUpdateInterval = undefined;
		}
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.enabledAssistActions.clear();
		this.gameActionLocations.clear();
		this.playerCustomBoxes.clear();
		this.winners.clear();
		this.htmlPages.clear();
		if (this.lives) this.lives.clear();
		if (this.points) this.points.clear();
	}

	deallocate(forceEnd: boolean): void {
		if (!this.ended) this.ended = true;

		if (this.htmlPages.size) {
			this.htmlPages.forEach(htmlPage => {
				// already destroyed in CommandParser.onDestroyUser()
				if (htmlPage.destroyed) return;

				if (this.dontAutoCloseHtmlPages) {
					htmlPage.sendClosingSnapshot();
				} else {
					htmlPage.close();
				}
			});
		}

		if (this.usesHtmlPage) {
			for (const i in this.players) {
				this.players[i].closeHtmlPage();
			}
		}

		this.cleanupMessageListeners();
		this.cleanupTimers();
		this.cleanupMisc();

		for (const listener of this.commandsListeners) {
			this.offCommands(listener.commands);
		}

		if ((!this.started || this.options.freejoin) && this.notifyRankSignups) (this.room as Room).notifyOffRank("all");

		this.cleanupBattleRooms();

		if (this.onDeallocate) {
			try {
				this.onDeallocate(forceEnd);
			} catch (e) {
				console.log(e);
				Tools.logException(e as NodeJS.ErrnoException, this.name + " onDeallocate()");
			}
		}

		if (!this.isPmActivity(this.room)) {
			if (this.room.tournament && this.room.tournament.battleRoomGame === this) {
				this.room.tournament.battleRoomGame = undefined;
			}

			if (this.subRoom && this.subRoom.tournament && this.subRoom.tournament.battleRoomGame === this) {
				this.subRoom.tournament.battleRoomGame = undefined;
			}

			// @ts-expect-error
			if (this.room.searchChallenge === this) {
				// @ts-expect-error
				this.room.searchChallenge = undefined; // eslint-disable-line @typescript-eslint/no-unsafe-member-access
			}
		}

		if (this.room.game === this) {
			// @ts-expect-error
			this.room.game = undefined;
		}

		if (this.parentGame) {
			this.parentGame.room.game = this.parentGame;
			this.parentGame.prng.destroy();
			this.parentGame.prng = new PRNG(this.prng.seed);
			if (this.parentGame.onChildEnd) {
				try {
					this.parentGame.onChildEnd(this.winners);
				} catch (e) {
					console.log(e);
					Tools.logException(e as NodeJS.ErrnoException, this.parentGame.name + " onChildEnd() (" + this.name + ")");
				}
			}
		}

		if (this.onAfterDeallocate) {
			try {
				this.onAfterDeallocate(forceEnd);
			} catch (e) {
				console.log(e);
				Tools.logException(e as NodeJS.ErrnoException, this.name + " onAfterDeallocate()");
			}
		}

		this.destroyTeams();
		this.destroyPlayers();

		this.writeDebugLog();
		if (Config.scriptedGameDebugStats) Tools.appendFile(this.getDebugLogPath("stats"), "\n" + this.name + " ended");

		if (!this.isPmActivity(this.room)) {
			this.afterAddBits();

			if (!this.isMiniGame && (this.updatedBits || this.updatedDatabase)) Storage.tryExportDatabase(this.room.id);
		}

		Tools.unrefProperties(this, ["ended", "id", "name"]);
	}

	inheritPlayers(players: Dict<Player>): void {
		this.inheritedPlayers = true;

		for (const i in players) {
			this.players[i] = players[i];
			if (this.onAddPlayer && !this.options.freejoin) {
				try {
					this.onAddPlayer(this.players[i]);
				} catch (e) {
					console.log(e);
					Tools.logException(e as NodeJS.ErrnoException, this.name + " onAddPlayer()");
					this.errorEnd();
					return;
				}
			}
			this.playerCount++;
		}
	}

	async addPlayer(user: User, tournamentJoin?: boolean): Promise<Player | undefined> {
		if (this.managedPlayers) return;

		if (this.usesTournamentJoin && !tournamentJoin) return;

		if (this.options.freejoin || this.isMiniGame) {
			if (!this.joinNotices.has(user.id)) {
				this.sendFreeJoinNotice(user);
				this.joinNotices.add(user.id);
			}
			return;
		}

		const player = this.createPlayer(user);
		if (!player) {
			if (this.onAddExistingPlayer) {
				try {
					this.onAddExistingPlayer(this.players[user.id]);
				} catch (e) {
					console.log(e);
					Tools.logException(e as NodeJS.ErrnoException, this.name + " onAddExistingPlayer()");
					this.errorEnd();
				}
			}
			return;
		}

		let failedToJoin = false;
		// separate notice for max player cap
		if (this.started && this.playerCap && this.playerCount >= this.playerCap) {
			if (!this.joinNotices.has(user.id)) {
				player.sayPrivateHtml("The game has already reached the max player count.");
				this.joinNotices.add(user.id);
			}

			failedToJoin = true;
		}

		if (this.started && !this.canLateJoin) {
			if (!this.joinNotices.has(user.id)) {
				player.sayPrivateHtml(this.canLateJoin === undefined ? "This game does not support late-joins." :
					"The late-join window for this game has closed.");
				this.joinNotices.add(user.id);
			}

			failedToJoin = true;
		}

		if (this.requiresAutoconfirmed && user.autoconfirmed !== null) {
			if (!user.autoconfirmed) {
				this.sendNotAutoconfirmed(player);
				failedToJoin = true;
			}
		}

		if (failedToJoin) {
			this.destroyPlayer(user, true);
			return;
		}

		const onSuccessfulJoin = async (): Promise<Player | undefined> => {
			let addPlayerResult: boolean | undefined = true;
			if (this.onAddPlayer) {
				try {
					addPlayerResult = this.onAddPlayer(player, this.started);
				} catch (e) {
					console.log(e);
					Tools.logException(e as NodeJS.ErrnoException, this.name + " onAddPlayer()");
					this.errorEnd();
					return;
				}
			}

			if (!addPlayerResult) {
				this.destroyPlayer(user, true);
				return;
			}

			if (this.started && this.queueLateJoins && (!this.tryQueueLateJoin || !this.tryQueueLateJoin(player))) {
				this.lateJoinQueue.push(player);

				const presentPlayers: Player[] = [];
				for (const queuedPlayer of this.lateJoinQueue) {
					const queuedUser = Users.get(queuedPlayer.name);
					if (!queuedUser || !queuedUser.rooms.has(this.room as Room)) continue;
					presentPlayers.push(queuedPlayer);
				}

				if (presentPlayers.length === this.lateJoinQueueSize) {
					this.processLateJoinQueue(presentPlayers);
				} else {
					player.frozen = true;

					let lateJoinQueueMessage: string;
					if (this.getLateJoinQueueMessage) {
						lateJoinQueueMessage = this.getLateJoinQueueMessage(player);
					} else {
						const playersNeeded = this.lateJoinQueueSize! - this.lateJoinQueue.length;
						lateJoinQueueMessage = "You have been added to the late-join queue! " + playersNeeded + " more player" +
						(playersNeeded > 1 ? "s need" : " needs") + " to late-join for you to be able to play.";
					}

					player.sayPrivateUhtml(lateJoinQueueMessage, this.joinLeaveButtonUhtmlName);
				}

				return;
			}

			if (!this.internalGame && !this.joinNotices.has(user.id)) {
				this.sendJoinNotice(player);
				this.joinNotices.add(user.id);
			}

			if (this.started) {
				for (const listener of this.commandsListeners) {
					if (listener.remainingPlayersMax) this.increaseOnCommandsMax(listener, 1);
				}
			} else {
				if (this.playerCap && this.playerCount >= this.playerCap) {
					if (this.canLateJoin) this.canLateJoin = false;
					await this.start();
				}
			}

			return player;
		};

		if (this.requiresAutoconfirmed && user.autoconfirmed === null) {
			this.checkPlayerAutoconfirmed(player, () => void onSuccessfulJoin());
			return player;
		} else {
			return await onSuccessfulJoin();
		}
	}

	removePlayer(user: User | string, silent?: boolean, notAutoconfirmed?: boolean): void {
		if (this.isMiniGame) return;

		const player = this.destroyPlayer(user);
		if (!player) return;

		const id = typeof user === 'string' ? Tools.toId(user) : user.id;
		if (!silent && !this.leaveNotices.has(id)) {
			this.sendLeaveNotice(player);
			this.leaveNotices.add(id);
		}

		if (this.options.freejoin) return;

		if (this.commandsListeners.length) {
			const commandsListeners = this.commandsListeners.slice();
			for (const listener of commandsListeners) {
				if (listener.remainingPlayersMax) {
					this.decreaseOnCommandsMax(listener, 1);
					if (this.ended) return;
				}
			}
		}

		if (this.onRemovePlayer) {
			try {
				this.onRemovePlayer(player, notAutoconfirmed);
			} catch (e) {
				console.log(e);
				Tools.logException(e as NodeJS.ErrnoException, this.name + " onRemovePlayer()");
				this.errorEnd();
				return;
			}
		}

		if (!this.ended) {
			const htmlPage = this.htmlPages.get(player);
			if (htmlPage) {
				htmlPage.close();
				this.htmlPages.delete(player);
			}

			if (this.usesHtmlPage) {
				player.closeHtmlPage();
			}
		}
	}

	processLateJoinQueue(processedPlayers: Player[]): void {
		for (const listener of this.commandsListeners) {
			if (listener.remainingPlayersMax) this.increaseOnCommandsMax(listener, processedPlayers.length);
		}

		for (const queuedPlayer of processedPlayers) {
			queuedPlayer.frozen = false;
			queuedPlayer.sendRoomHighlight("You are now in the game!");
			this.lateJoinQueue.splice(this.lateJoinQueue.indexOf(queuedPlayer, 1));
		}

		if (this.onAddLateJoinQueuedPlayers) {
			try {
				this.onAddLateJoinQueuedPlayers(processedPlayers);
			} catch (e) {
				console.log(e);
				Tools.logException(e as NodeJS.ErrnoException, this.name + " onAddLateJoinQueuedPlayers()");
				this.errorEnd();
				return;
			}
		}
	}

	/** Returns `true` if the player has been inactive for the game's inactive round limit */
	incrementPlayerInactiveRound(player: Player): boolean {
		if (!player.inactiveRounds) player.inactiveRounds = 0;
		player.inactiveRounds++;

		if (this.playerInactiveRoundLimit && player.inactiveRounds >= this.playerInactiveRoundLimit) return true;
		return false;
	}

	eliminatePlayer(player: Player, eliminationMessage?: string | null, eliminator?: Player | null): void {
		player.eliminated = true;
		if (eliminationMessage) player.say(eliminationMessage + " You have been eliminated from the game.");

		if (this.onEliminatePlayer) {
			try {
				this.onEliminatePlayer(player, eliminator);
			} catch (e) {
				console.log(e);
				Tools.logException(e as NodeJS.ErrnoException, this.name + " onEliminatePlayer()");
				this.errorEnd();
			}
		}
	}

	sendNotAutoconfirmed(player: Player): void {
		player.say("You must be autoconfirmed to participate in " + this.name + ".");
	}

	checkPlayerAutoconfirmed(player: Player, autoconfirmedCallback: () => void): void {
		const user = Users.get(player.name);
		if (!user || user.autoconfirmed !== null) return;

		Client.getUserDetails(user, (checkedUser) => {
			if (checkedUser.autoconfirmed) {
				autoconfirmedCallback();
			} else {
				this.removePlayer(checkedUser, true, true);
				this.sendNotAutoconfirmed(player);
			}
		});
	}

	sendPlayerAssistActions(player: Player, html: string, uhtmlName?: string): void {
		if (!this.enabledAssistActions.has(player)) {
			const database = Storage.getDatabase(this.room as Room);
			if (database.gameScriptedOptions && player.id in database.gameScriptedOptions &&
				database.gameScriptedOptions[player.id].assistActions !== undefined) {
				this.enabledAssistActions.set(player, database.gameScriptedOptions[player.id].assistActions!);
			} else {
				this.enabledAssistActions.set(player, true);
			}
		}

		if (this.enabledAssistActions.get(player)) {
			player.sayPrivateUhtml(html, uhtmlName);
			if (!player.sentAssistActions) player.sentAssistActions = true;
		}
	}

	clearPlayerAssistActions(player: Player, uhtmlName: string): void {
		if (player.sentAssistActions) player.clearPrivateUhtml(uhtmlName);
	}

	getGameActionLocation(player: Player): GameActionLocations {
		if (this.gameActionType && !this.gameActionLocations.has(player)) {
			const database = Storage.getDatabase(this.room as Room);
			if (database.gameScriptedOptions && player.id in database.gameScriptedOptions &&
				database.gameScriptedOptions[player.id].actionsLocations &&
				database.gameScriptedOptions[player.id].actionsLocations![this.gameActionType]) {
				this.gameActionLocations.set(player, database.gameScriptedOptions[player.id].actionsLocations![this.gameActionType]!);
			} else {
				this.gameActionLocations.set(player, 'chat');
			}
		}

		return this.gameActionLocations.get(player) || 'chat';
	}

	sendPlayerActions(player: Player, html: string): void {
		const location = this.getGameActionLocation(player);
		if (location === 'htmlpage') {
			player.sendHtmlPage(html);
		} else {
			player.sayPrivateUhtml(html, this.actionsUhtmlName);
		}
	}

	getCommandsAndAliases(commands: readonly string[]): string[] {
		const commandsAndAliases: string[] = [];
		for (const command of commands) {
			if (!(command in this.commands)) continue;
			const commandDefinition = this.commands[command];
			for (const i in this.commands) {
				if (this.commands[i].command === commandDefinition.command) {
					commandsAndAliases.push(i);
				}
			}
		}
		return commandsAndAliases.sort();
	}

	findCommandsListener(commands: readonly string[]): IGameCommandCountListener | null {
		const commandsAndAliases = this.getCommandsAndAliases(commands);
		let commandListener: IGameCommandCountListener | null = null;
		for (const listener of this.commandsListeners) {
			if (listener.commands.length !== commandsAndAliases.length) continue;
			let match = true;
			for (let j = 0; j < listener.commands.length; j++) {
				if (listener.commands[j] !== commandsAndAliases[j]) {
					match = false;
					break;
				}
			}
			if (match) {
				commandListener = listener;
				break;
			}
		}

		return commandListener;
	}

	increaseOnCommandsMax(commands: readonly string[] | IGameCommandCountListener, increment: number): void {
		let commandListener: IGameCommandCountListener | null = null;
		if (Array.isArray(commands)) {
			commandListener = this.findCommandsListener(this.getCommandsAndAliases(commands));
		} else {
			commandListener = commands as IGameCommandCountListener;
		}

		if (commandListener) commandListener.max += increment;
	}

	decreaseOnCommandsMax(commands: string[] | IGameCommandCountListener, decrement: number): void {
		let commandListener: IGameCommandCountListener | null = null;
		if (Array.isArray(commands)) {
			commandListener = this.findCommandsListener(this.getCommandsAndAliases(commands));
		} else {
			commandListener = commands;
		}

		if (commandListener) {
			commandListener.max -= decrement;
			if (commandListener.count >= commandListener.max) {
				commandListener.listener(commandListener.lastUserId);
				if (this.ended) return;

				this.commandsListeners.splice(this.commandsListeners.indexOf(commandListener, 1));
			}
		}
	}

	onCommands(commands: readonly string[], options: IGameCommandCountOptions, listener: GameCommandListener): void {
		const commandsAndAliases = this.getCommandsAndAliases(commands);
		this.offCommands(commandsAndAliases);
		this.commandsListeners.push(Object.assign(options, {commands: commandsAndAliases, count: 0, lastUserId: '', listener}));
	}

	offCommands(commands: string[]): void {
		const commandListener = this.findCommandsListener(commands);
		if (commandListener) {
			this.commandsListeners.splice(this.commandsListeners.indexOf(commandListener, 1));
		}
	}

	tryCommand(target: string, room: Room | User, user: User, command: string, timestamp: number): boolean {
		if (!(command in this.commands) || (!this.started && !this.commands[command].signupsGameCommand)) return false;

		let canUseCommands = true;
		if (this.inheritedPlayers) {
			if (!(user.id in this.players) || this.players[user.id].eliminated) canUseCommands = false;
		} else {
			if (user.id in this.players) {
				if (this.players[user.id].eliminated) canUseCommands = false;
			} else {
				if (!this.options.freejoin) canUseCommands = false;
			}
		}

		const commandDefinition = this.commands[command];
		if (!canUseCommands && !(!(user.id in this.players) && commandDefinition.spectatorGameCommand) &&
			!(user.id in this.players && this.players[user.id].eliminated && commandDefinition.eliminatedGameCommand) &&
			!(commandDefinition.staffGameCommand && !this.isPmActivity(this.room) && user.hasRank(this.room, 'driver'))) {
			return false;
		}

		const isPm = room === user;
		if (isPm) {
			if (!this.isPmActivity(this.room) && !commandDefinition.pmGameCommand && !commandDefinition.pmOnly) return false;
		} else {
			if (commandDefinition.pmOnly) return false;
		}

		this.debugLog(user.name + " used the " + (isPm ? "PM " : "") + "command: " + Config.commandCharacter + command +
			(target ? " " + target : ""));

		let result: GameCommandReturnType = false;
		try {
			result = commandDefinition.command.call(this, target, room, user, command, timestamp);
		} catch (e) {
			console.log(e);
			Tools.logException(e as NodeJS.ErrnoException, this.name + " command " + command);
			this.errorEnd();
			return false;
		}

		if (!result) return false;
		if (this.ended) return true;

		const triggeredListeners: IGameCommandCountListener[] = [];
		for (const commandListener of this.commandsListeners) {
			for (const listenerCommand of commandListener.commands) {
				if (listenerCommand !== command) continue;
				commandListener.count++;
				commandListener.lastUserId = user.id;

				if (commandListener.count >= commandListener.max) {
					try {
						commandListener.listener(commandListener.lastUserId);
					} catch (e) {
						console.log(e);
						Tools.logException(e as NodeJS.ErrnoException, this.name + " command listener for [" +
							commandListener.commands.join(', ') + "]");
						this.errorEnd();
						return false;
					}

					triggeredListeners.push(commandListener);
				}
				break;
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!this.ended) {
			for (const listener of triggeredListeners) {
				// could be removed already in listener()
				const index = this.commandsListeners.indexOf(listener);
				if (index !== -1) this.commandsListeners.splice(index, 1);
			}
		}

		return result;
	}

	sendHtmlPage(player: Player, forceSend?: boolean): void {
		if (this.getHtmlPage) this.getHtmlPage(player).send({forceSend});
	}

	sendChatHtmlPage(player: Player): void {
		if (this.getHtmlPage) {
			const htmlPage = this.getHtmlPage(player);
			if (htmlPage.chatUhtmlName) htmlPage.send();
		}
	}

	runHtmlPageCommand(target: string, user: User): void {
		if (!(user.id in this.players)) return;

		const htmlPage = this.htmlPages.get(this.players[user.id]);
		if (!htmlPage) return;

		const targets = target.split(',');
		const targetRoom = Rooms.search(targets[0]);
		targets.shift();

		if (!targetRoom || targetRoom.id !== this.room.id) return;

		const command = Tools.toId(targets[0]);
		targets.shift();

		htmlPage.tryCommand(command, targets);
	}

	addBits(user: User | Player, bits: number, noPm?: boolean, achievementBits?: boolean): boolean {
		if (this.isPmActivity(this.room) || !Config.rankedGames || !Config.rankedGames.includes(this.room.id) ||
			(this.parentGame && this.parentGame.allowChildGameBits !== true) ||
			(this.format.minigameCreator && this.format.minigameCreator === user.id)) return false;

		bits = Math.floor(bits);
		if (bits <= 0) return false;

		if (!achievementBits) {
			if (bits > this.maxBits) bits = this.maxBits;
			if (this.shinyMascot) bits *= 2;
		}

		if (!this.updateBitsSource) this.updateBitsSource = this.format.id;

		Storage.addPoints(this.room, Storage.gameLeaderboard, user.name, bits, this.updateBitsSource, true);
		if (!noPm) {
			user.say("You were awarded " + bits + " bits! To see your total amount, use the command ``" + Config.commandCharacter +
				"bits " + this.room.title + "``.");
		}

		if (!this.updatedBits) this.updatedBits = true;
		return true;
	}

	removeBits(user: User | Player, bits: number, noPm?: boolean): boolean {
		if (this.isPmActivity(this.room) || !Config.rankedGames || !Config.rankedGames.includes(this.room.id) ||
			(this.parentGame && this.parentGame.allowChildGameBits !== true)) return false;

		bits = Math.floor(bits);
		if (bits <= 0) return false;
		if (this.shinyMascot) bits *= 2;

		if (!this.updateBitsSource) this.updateBitsSource = this.format.id;

		Storage.removePoints(this.room, Storage.gameLeaderboard, user.name, bits, this.updateBitsSource, true);
		if (!noPm) {
			user.say("You lost " + bits + " bits! To see your remaining amount, use the command ``" + Config.commandCharacter + "bits " +
				this.room.title + "``.");
		}

		if (!this.updatedBits) this.updatedBits = true;
		return true;
	}

	convertPointsToBits(winnerBits?: number, loserBits?: number): void {
		if (this.parentGame && this.parentGame.allowChildGameBits !== true) return;
		if (!this.points) throw new Error(this.name + " called convertPointsToBits() with no points Map");
		if (winnerBits === undefined) winnerBits = this.winnerPointsToBits;
		if (loserBits === undefined) loserBits = this.loserPointsToBits;
		this.points.forEach((points, player) => {
			if (points <= 0) return;
			let winnings = 0;
			if (this.winners.has(player)) {
				winnings = Math.floor(winnerBits * points);
			} else {
				winnings = Math.floor(loserBits * points);
			}
			if (winnings) this.addBits(player, winnings);
		});
	}

	addLives(player: Player, addedLives: number): number {
		if (!this.lives) throw new Error(this.name + " called addLives with no lives Map");

		let lives = this.lives.get(player) || 0;
		lives = Math.max(0, lives + addedLives);
		this.lives.set(player, lives);

		if (!lives) player.eliminated = true;

		return lives;
	}

	getPlayerLives(players?: PlayerList): string {
		return this.getPlayerAttributes(player => {
			const lives = this.lives!.get(player) || this.startingLives;
			return this.getPlayerUsernameHtml(player.name) + (lives ? " (" + lives + ")" : "");
		}, players).join(', ');
	}

	getBattleSlotPlayer(battleData: IBattleGameData, targetSlot: string): Player | undefined {
		let targetPlayer;
		battleData.slots.forEach((slot, player) => {
			if (slot === targetSlot) {
				targetPlayer = player;
			}
		});

		return targetPlayer;
	}

	/**Returns an array of players who re-unlocked the achievement, if any */
	unlockAchievement(players: Player | Player[], achievement: IGameAchievement): Player[] | undefined {
		if (this.isPmActivity(this.room) || !Config.allowGameAchievements || !Config.allowGameAchievements.includes(this.room.id) ||
			(this.format.mode && this.format.mode.id !== achievement.mode)) return;

		if (this.isMiniGame) {
			if (!achievement.minigame) return;
		} else {
			if (achievement.minigame) return;
		}

		const database = Storage.getDatabase(this.room);
		if (!database.gameAchievements) database.gameAchievements = {};

		const achievementId = Tools.toId(achievement.name);
		const firstUnlock: Player[] = [];
		const repeatUnlock: Player[] = [];

		if (!Array.isArray(players)) players = [players];
		for (const player of players) {
			let repeat = false;
			if (player.id in database.gameAchievements) {
				if (database.gameAchievements[player.id].includes(achievementId)) {
					if (!achievement.repeatBits) continue;
					repeat = true;
				} else {
					database.gameAchievements[player.id].push(achievementId);
				}
			} else {
				database.gameAchievements[player.id] = [achievementId];
			}

			if (repeat) {
				repeatUnlock.push(player);
				this.addBits(player, achievement.repeatBits!, false, true);
			} else {
				firstUnlock.push(player);
				this.addBits(player, achievement.bits, false, true);
			}
		}

		if (firstUnlock.length) {
			this.say(Tools.joinList(firstUnlock.map(x => x.name), "**") + " unlocked the **" + achievement.name + "** achievement!");
		}

		if (repeatUnlock.length) {
			this.say(Tools.joinList(repeatUnlock.map(x => x.name), "**") + " re-unlocked the **" + achievement.name + "** achievement!");
		}

		return repeatUnlock;
	}

	acceptChallenge?(user: User): boolean;
	botChallengeTurn?(botPlayer: Player, newAnswer: boolean): void;
	cancelChallenge?(user: User): boolean;
	getForceEndMessage?(): string;
	getPlayerSummary?(player: Player): void;
	getRandomAnswer?(): IRandomGameAnswer;
	/** Return `false` to prevent a user from being added to the game (and send the reason to the user) */
	onAddPlayer?(player: Player, lateJoin?: boolean): boolean | undefined;
	/** Return `false` to add a player to the late-join queue */
	tryQueueLateJoin?(player: Player): boolean;
	getLateJoinQueueMessage?(player: Player): string;
	onAddLateJoinQueuedPlayers?(players: Player[]): void;
	onAddExistingPlayer?(player: Player): void;
	onAfterDeallocate?(forceEnd: boolean): void;
	onBattleExpire?(room: Room): void;
	/** Return `false` to signal that the battle should be left */
	onBattleFaint?(room: Room, slot: string): boolean;
	onBattlePlayer?(room: Room, slot: string, username: string): void;
	/** Return `false` to signal that the battle should be left */
	onBattleMessage?(room: Room, message: string): boolean;
	/** Return `false` to signal that the battle should be left */
	onBattleMove?(room: Room, pokemon: string, move: string, target: string): boolean;
	/** Return `false` to signal that the battle should be left */
	onBattlePokemon?(room: Room, slot: string, details: string, item: boolean): boolean;
	/** Return `false` to signal that the battle should be left */
	onBattleTeamSize?(room: Room, slot: string, size: number): boolean;
	/** Return `false` to signal that the battle should be left */
	onBattleTeamPreview?(room: Room): boolean;
	/** Return `false` to signal that the battle should be left */
	onBattleStart?(room: Room): boolean;
	/** Return `false` to signal that the battle should be left */
	onBattleSwitch?(room: Room, pokemon: string, details: string, hpStatus: [string, string]): boolean;
	onBattleTie?(room: Room): void;
	onBattleWin?(room: Room, winner: string): void;
	onChildEnd?(winners: Map<Player, number>): void;
	onChildHint?(hint: string, answers: readonly string[], newAnswer: boolean): void;
	onChildPlayerTurn?(player: Player): void;
	onDeallocate?(forceEnd: boolean): void;
	onEliminatePlayer?(player: Player, eliminator?: Player | null): void;
	onMaxRound?(): void;
	async onNextRound?(): Promise<void>;
	onRemovePlayer?(player: Player, notAutoconfirmed?: boolean): void;
	async onSignups?(): Promise<void>;
	async onStart?(): Promise<void>;
	/** Return `false` to continue the game until another condition is met */
	onTimeLimit?(): boolean;
	onTournamentEnd?(forceEnd?: boolean): void;
	onTournamentStart?(players: Dict<Player>, rootNode?: IClientTournamentData, ): void;
	onTournamentPlayerJoin?(player: Player): void;
	onTournamentPlayerLeave?(name: string): void;
	onTournamentPlayerRename?(player: Player, oldId: string): void;
	onTournamentUsersUpdate?(players: Dict<Player>, users: string[]): void;
	onTournamentBracketUpdate?(players: Dict<Player>, rootNode: IClientTournamentData, tournamentStarted: boolean): void;
	onTournamentBattleStart?(player: Player, opponent: Player, roomid: string): void;
	parseChatMessage?(user: User, message: string): void;
	rejectChallenge?(user: User): boolean;
	repostInformation?(): void;
	setupChallenge?(challenger: User, challenged: User, format: IGameFormat, options?: Dict<string>): void;
	startTournament?(): boolean;
	validateInputProperties?(inputProperties: IGameInputProperties): boolean;
}
