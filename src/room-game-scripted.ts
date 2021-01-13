import type { PRNGSeed } from "./lib/prng";
import { PRNG } from "./lib/prng";
import type { Player } from "./room-activity";
import { Game } from "./room-game";
import type { Room } from "./rooms";
import type {
	DefaultGameOption,
	GameCommandListener, GameCommandReturnType, IBattleGameData, IGameAchievement, IGameCommandCountListener, IGameCommandCountOptions,
	IGameFormat, IGameMode, IGameOptionValues, IGameVariant, IRandomGameAnswer, LoadedGameCommands, PlayerList
} from "./types/games";
import type { User } from "./users";

const JOIN_BITS = 10;
const AUTO_START_VOTE_TIME = 5 * 1000;

// base of 0 defaults option to 'off'
const defaultOptionValues: KeyedDict<DefaultGameOption, IGameOptionValues> = {
	points: {min: 10, base: 10, max: 10},
	teams: {min: 2, base: 2, max: 4},
	cards: {min: 4, base: 5, max: 6},
	freejoin: {min: 1, base: 0, max: 1},
};

export class ScriptedGame extends Game {
	autoCloseHtmlPage: boolean = true;
	awardedBits: boolean = false;
	canLateJoin: boolean = false;
	readonly commands = Object.assign(Object.create(null), Games.sharedCommands) as LoadedGameCommands;
	readonly commandsListeners: IGameCommandCountListener[] = [];
	inactiveRounds: number = 0;
	inheritedPlayers: boolean = false;
	internalGame: boolean = false;
	lateJoinQueue: Player[] = [];
	readonly loserPointsToBits: number = 10;
	readonly maxBits: number = 500;
	notifyRankSignups: boolean = false;
	parentGame: ScriptedGame | undefined;
	startTime: number = 0;
	usesHtmlPage: boolean = false;
	usesWorkers: boolean = false;
	readonly winnerPointsToBits: number = 50;

	// set in onInitialize()
	format!: IGameFormat;

	additionalDescription?: string;
	allowChildGameBits?: boolean;
	readonly battleData?: Map<Room, IBattleGameData>;
	readonly battleRooms?: string[];
	commandDescriptions?: string[];
	isMiniGame?: boolean;
	lateJoinQueueSize?: number;
	readonly lives?: Map<Player, number>;
	maxRound?: number;
	noForceEndMessage?: boolean;
	playerInactiveRoundLimit?: number;
	queueLateJoins?: boolean;
	shinyMascot?: boolean;
	startingLives?: number;
	subGameNumber?: number;
	timeEnded?: boolean;
	timeLimit?: number;

	constructor(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed) {
		super(room, pmRoom, initialSeed);
	}

	static setOptions<T extends ScriptedGame>(format: IGameFormat<T>, mode: IGameMode | undefined, variant: IGameVariant | undefined):
		Dict<number> {
		const namePrefixes: string[] = [];
		const nameSuffixes: string[] = [];
		if (format.freejoin || (variant && variant.freejoin)) {
			format.customizableOptions.freejoin = {
				min: 1,
				base: 1,
				max: 1,
			};
		}
		if (mode) mode.class.setOptions(format, namePrefixes, nameSuffixes);

		for (const defaultOption of format.defaultOptions) {
			if (defaultOption in format.customizableOptions) continue;
			let base: number;
			if (defaultOptionValues[defaultOption].base === 0) {
				base = 0;
			} else {
				base = defaultOptionValues[defaultOption].base || 5;
			}
			format.customizableOptions[defaultOption] = {
				min: defaultOptionValues[defaultOption].min || 1,
				base,
				max: defaultOptionValues[defaultOption].max || 10,
			};
		}

		const options: Dict<number> = {};
		for (const i in format.customizableOptions) {
			options[i] = format.customizableOptions[i].base;
		}

		const customizedOptions: Dict<number> = {};
		for (const i in format.inputOptions) {
			if (!(i in format.customizableOptions) || format.inputOptions[i] === format.customizableOptions[i].base) continue;

			let optionValue = format.inputOptions[i];
			if (optionValue < format.customizableOptions[i].min) {
				optionValue = format.customizableOptions[i].min;
			} else if (optionValue > format.customizableOptions[i].max) {
				optionValue = format.customizableOptions[i].max;
			}

			options[i] = optionValue;
			customizedOptions[i] = optionValue;
		}

		if (customizedOptions.points) nameSuffixes.push("(first to " + customizedOptions.points + ")");
		if (customizedOptions.teams) namePrefixes.unshift('' + customizedOptions.teams);
		if (customizedOptions.cards) namePrefixes.unshift(customizedOptions.cards + "-card");
		if (customizedOptions.gen) namePrefixes.unshift('Gen ' + customizedOptions.gen);
		if (customizedOptions.ports) namePrefixes.unshift(customizedOptions.ports + '-port');
		if (customizedOptions.params) namePrefixes.unshift(customizedOptions.params + '-param');
		if (customizedOptions.names) namePrefixes.unshift(customizedOptions.names + '-name');
		if (customizedOptions.freejoin && !format.freejoin) nameSuffixes.push("(freejoin)");

		let nameWithOptions = '';
		if (namePrefixes.length) nameWithOptions = namePrefixes.join(" ") + " ";
		if (variant && variant.name) {
			nameWithOptions += variant.name;
		} else {
			nameWithOptions += format.name;
		}
		if (nameSuffixes.length) nameWithOptions += " " + nameSuffixes.join(" ");

		format.nameWithOptions = nameWithOptions;

		return options;
	}

	setUhtmlBaseName(): void {
		let gameCount: number;
		if (this.isPm(this.room)) {
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
	}

	onInitialize(format: IGameFormat): void {
		this.format = format;
		this.baseHtmlPageId = this.room.id + "-" + this.format.id;
		this.setUhtmlBaseName();

		if (format.commands) Object.assign(this.commands, format.commands);
		if (format.commandDescriptions) this.commandDescriptions = format.commandDescriptions;
		if (format.additionalDescription) this.additionalDescription = format.additionalDescription;
		if (format.mascot) {
			this.mascot = Dex.getPokemonCopy(format.mascot);
		} else if (format.mascots) {
			this.mascot = Dex.getPokemonCopy(this.sampleOne(format.mascots));
		}
		if (format.variant) {
			// @ts-expect-error
			delete format.variant.name;
			Object.assign(this, format.variant);
		}
		if (format.mode) {
			if (format.modeProperties && format.mode.id in format.modeProperties) {
				Object.assign(this, format.modeProperties[format.mode.id]);
			}
			format.mode.initialize(this);
		}

		let htmlPageHeader = "<h2>";
		if (this.mascot) htmlPageHeader += Dex.getPokemonIcon(this.mascot);
		htmlPageHeader += (this.format.nameWithOptions || this.format.name) + "</h2>";
		this.htmlPageHeader = htmlPageHeader;
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

	getMascotAndNameHtml(additionalText?: string): string {
		let minigameDescription: string | undefined;
		if (this.isMiniGame) {
			minigameDescription = this.getMinigameDescription();
		}

		const mascot = this.mascot ? Dex.getPokemonIcon(this.mascot) : '';
		return mascot + "<b>" + (this.isMiniGame ? "Mini " : "") + this.name + (additionalText || "") + "</b>" +
			(minigameDescription ? "<br />" + minigameDescription : "");
	}

	getDescriptionHtml(): string {
		let description = this.getDescription();
		if (this.additionalDescription) description += "<br /><br />" + this.additionalDescription;

		let commandDescriptions: string[] = [];
		if (this.getPlayerSummary) commandDescriptions.push(Config.commandCharacter + "summary");
		if (this.commandDescriptions) commandDescriptions = commandDescriptions.concat(this.commandDescriptions);
		if (commandDescriptions.length) {
			description += "<br /><b>Command" + (commandDescriptions.length > 1 ? "s" : "") + "</b>: " +
				commandDescriptions.map(x => "<code>" + x + "</code>").join(", ");
		}

		return Games.getScriptedBoxHtml(this.room as Room, this.name, this.format.voter, description, this.mascot, this.shinyMascot,
			!this.internalGame && !this.parentGame ? this.getHighlightPhrase() : "",
			this.format.mode ? this.getModeHighlightPhrase() : "");
	}

	getSignupsHtml(): string {
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
		return Games.scriptedGameHighlight + " " + this.id;
	}

	getModeHighlightPhrase(): string {
		if (!this.format.mode) return "";
		return Games.scriptedGameHighlight + " " + this.format.mode.id;
	}

	signups(): void {
		this.signupsTime = Date.now();
		this.signupsStarted = true;

		if (!this.isMiniGame && !this.internalGame) {
			this.showSignupsHtml = true;
			this.sayHtml(this.getSignupsHtml());
			if (!this.format.options.freejoin) this.sayUhtml(this.signupsUhtmlName, this.getSignupsHtmlUpdate());

			let joinLeaveHtml = "<center>";
			if (this.format.options.freejoin) {
				joinLeaveHtml += "<b>This game is free-join!</b>";
			} else {
				joinLeaveHtml += Client.getPmSelfButton(Config.commandCharacter + "joingame " + this.room.id, "Join game");
				joinLeaveHtml += " | ";
				joinLeaveHtml += Client.getPmSelfButton(Config.commandCharacter + "leavegame " + this.room.id, "Leave game");
			}
			joinLeaveHtml += "</center>";
			this.sayUhtml(this.joinLeaveButtonUhtmlName, joinLeaveHtml);
			this.notifyRankSignups = true;
			this.sayCommand("/notifyrank all, " + (this.room as Room).title + " scripted game," + this.name + "," +
				this.getHighlightPhrase(), true);
			if (this.format.mode) {
				this.sayCommand("/notifyrank all, " + (this.room as Room).title + " scripted game," + this.name + "," +
					this.getModeHighlightPhrase(), true);
			}
		}

		if (this.shinyMascot) this.say(this.mascot!.name + " is shiny so bits will be doubled!");

		if (this.onSignups) {
			try {
				this.onSignups();
			} catch (e) {
				console.log(e);
				Tools.logError(e, this.format.name + " onSignups()");
				this.errorEnd();
				return;
			}
		}

		if (this.format.options.freejoin) {
			this.started = true;
			this.startTime = Date.now();
		} else if (!this.internalGame && !this.isMiniGame) {
			if (Config.gameAutoStartTimers && this.room.id in Config.gameAutoStartTimers) {
				const startTimer = (Config.gameAutoStartTimers[this.room.id] * 60 * 1000) / 2;
				this.startTimer = setTimeout(() => {
					if (this.signupsHtmlTimeout) clearTimeout(this.signupsHtmlTimeout);
					this.sayUhtml(this.signupsUhtmlName, this.getSignupsHtmlUpdate());

					this.startTimer = setTimeout(() => {
						if (!this.start()) {
							this.startTimer = setTimeout(() => {
								if (!this.start()) {
									this.inactivityEnd();
								}
							}, startTimer);
						}
					}, startTimer);
				}, startTimer);
			}
		}

		if (this.isMiniGame && !this.internalGame) {
			this.nextRound();
		}
	}

	start(): boolean {
		if (this.started || (this.minPlayers && this.playerCount < this.minPlayers)) return false;

		if (this.startTimer) clearTimeout(this.startTimer);
		this.started = true;
		this.startTime = Date.now();
		if (this.notifyRankSignups) this.sayCommand("/notifyoffrank all");
		if (this.showSignupsHtml) {
			if (this.signupsHtmlTimeout) clearTimeout(this.signupsHtmlTimeout);
			this.sayUhtmlChange(this.joinLeaveButtonUhtmlName, "<div></div>");
		}

		if (!this.internalGame) this.say(this.name + " is starting! **Players (" + this.playerCount + ")**: " + this.getPlayerNames());

		if (this.onStart) {
			try {
				this.onStart();
			} catch (e) {
				console.log(e);
				Tools.logError(e, this.format.name + " onStart()");
				this.errorEnd();
			}
		}

		return true;
	}

	nextRound(): void {
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
					Tools.logError(e, this.format.name + " onMaxRound()");
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
					Tools.logError(e, this.format.name + " onTimeLimit()");
					this.errorEnd();
					return;
				}
			} else {
				timeEnded = true;
			}

			if (timeEnded) {
				this.say("The game has reached the time limit!");
				this.timeEnded = true;
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (!this.ended) this.end();
				return;
			}
		}

		if (this.onNextRound) {
			try {
				this.onNextRound();
			} catch (e) {
				console.log(e);
				Tools.logError(e, this.format.name + " onNextRound()");
				this.errorEnd();
			}
		}
	}

	getRoundHtml(getAttributes: (players: PlayerList) => string, players?: PlayerList | null, roundText?: string,
		attributeText?: string): string {
		let additionalSpanText = '';
		if (this.subGameNumber) additionalSpanText += " - Game " + this.subGameNumber;
		additionalSpanText += " - " + (roundText || "Round " + this.round);
		let html = '<div class="infobox">' + this.getMascotAndNameHtml(additionalSpanText);

		if (!players) players = this.getRemainingPlayers();
		const attributes = getAttributes.call(this, players);

		if (!attributeText) {
			const remainingPlayerCount = this.getRemainingPlayerCount(players);
			if (remainingPlayerCount > 0) {
				attributeText = (!this.format.options.freejoin ? "Remaining players" : "Players") + " (" + remainingPlayerCount + ")";
			}
		}

		if (attributes || attributeText) {
			html += "<br /><br />" + (attributeText ? attributeText : "") + (attributes ? (attributeText ? ": " : "") + attributes : "");
		}
		html += "</div>";

		return html;
	}

	end(): void {
		if (this.ended) throw new Error("Game already ended");
		this.ended = true;

		if (this.isPm(this.room)) {
			this.deallocate(false);
			return;
		}

		if (this.usesHtmlPage && this.autoCloseHtmlPage) {
			for (const i in this.players) {
				this.players[i].closeHtmlPage();
			}
		}

		if (this.onEnd) {
			try {
				this.onEnd();
			} catch (e) {
				console.log(e);
				Tools.logError(e, this.format.name + " onEnd()");
				this.errorEnd();
				return;
			}
		}

		const now = Date.now();
		let usedDatabase = false;

		if (this.isMiniGame) {
			Games.lastMinigames[this.room.id] = now;
		} else if (!this.parentGame && !this.internalGame) {
			Games.clearNextVoteBans(this.room);

			usedDatabase = true;
			const database = Storage.getDatabase(this.room);

			Games.lastGames[this.room.id] = now;
			Games.lastScriptedGames[this.room.id] = now;
			database.lastGameTime = now;

			if (!database.lastGameFormatTimes) database.lastGameFormatTimes = {};
			database.lastGameFormatTimes[this.format.id] = now;

			if (!database.pastGames) database.pastGames = [];
			database.pastGames.unshift({inputTarget: this.format.inputTarget, name: this.name, time: now});
			while (database.pastGames.length > 8) {
				database.pastGames.pop();
			}

			this.setCooldownAndAutoCreate('userhosted');
		}

		if (this.awardedBits || usedDatabase) Storage.exportDatabase(this.room.id);

		this.deallocate(false);
	}

	forceEnd(user: User, reason?: string): void {
		if (!this.noForceEndMessage) {
			const forceEndMessage = this.getForceEndMessage ? this.getForceEndMessage() : "";
			this.say("The " + this.name + " " + this.activityType + " was forcibly ended!" + (forceEndMessage ? " " +
				forceEndMessage : ""));
		}

		if (this.usesHtmlPage && this.autoCloseHtmlPage) {
			for (const i in this.players) {
				this.players[i].closeHtmlPage();
			}
		}

		if (this.onForceEnd) {
			try {
				this.onForceEnd(user, reason);
			} catch (e) {
				console.log(e);
				Tools.logError(e, this.format.name + " onForceEnd()");
			}
		}

		this.ended = true;
		this.deallocate(true);
	}

	deallocate(forceEnd: boolean): void {
		if (!this.ended) this.ended = true;

		this.cleanupMessageListeners();
		if (this.cleanupTimers) this.cleanupTimers();
		if (this.timeout) clearTimeout(this.timeout);
		if (this.startTimer) clearTimeout(this.startTimer);

		if ((!this.started || this.format.options.freejoin) && this.notifyRankSignups) this.sayCommand("/notifyoffrank all");

		if (this.onDeallocate) {
			try {
				this.onDeallocate(forceEnd);
			} catch (e) {
				console.log(e);
				Tools.logError(e, this.format.name + " onDeallocate()");
			}
		}

		if (this.room.game === this) delete this.room.game;

		if (this.parentGame) {
			this.parentGame.room.game = this.parentGame;
			this.parentGame.prng = new PRNG(this.prng.seed);
			if (this.parentGame.onChildEnd) this.parentGame.onChildEnd(this.winners);
		}

		if (this.onAfterDeallocate) {
			try {
				this.onAfterDeallocate(forceEnd);
			} catch (e) {
				console.log(e);
				Tools.logError(e, this.format.name + " onAfterDeallocate()");
			}
		}
	}

	inheritPlayers(players: Dict<Player>): void {
		this.inheritedPlayers = true;

		for (const i in players) {
			this.players[i] = players[i];
			if (this.onAddPlayer && !this.format.options.freejoin) {
				try {
					this.onAddPlayer(this.players[i]);
				} catch (e) {
					console.log(e);
					Tools.logError(e, this.format.name + " onAddPlayer()");
					this.errorEnd();
					return;
				}
			}
			this.playerCount++;
		}
	}

	addPlayer(user: User): Player | undefined {
		if (this.format.options.freejoin || this.isMiniGame) {
			user.say("This game does not require you to join.");
			return;
		}

		const player = this.createPlayer(user);
		if (!player) {
			if (this.onAddExistingPlayer) {
				try {
					this.onAddExistingPlayer(this.players[user.id]);
				} catch (e) {
					console.log(e);
					Tools.logError(e, this.format.name + " onAddExistingPlayer()");
					this.errorEnd();
				}
			}
			return;
		}

		if (this.started && (!this.canLateJoin || (this.playerCap && this.playerCount >= this.playerCap))) {
			this.destroyPlayer(user, true);
			return;
		}

		let addPlayerResult: boolean | undefined = true;
		if (this.onAddPlayer) {
			try {
				addPlayerResult = this.onAddPlayer(player, this.started);
			} catch (e) {
				console.log(e);
				Tools.logError(e, this.format.name + " onAddPlayer()");
				this.errorEnd();
				return;
			}
		}

		if (!addPlayerResult) {
			this.destroyPlayer(user, true);
			return;
		}

		if (this.started && this.queueLateJoins) {
			this.lateJoinQueue.push(player);
			if (this.lateJoinQueue.length === this.lateJoinQueueSize) {
				for (const listener of this.commandsListeners) {
					if (listener.remainingPlayersMax) this.increaseOnCommandsMax(listener, this.lateJoinQueueSize);
				}

				const queuedPlayers = this.lateJoinQueue.slice(0, this.lateJoinQueueSize);
				for (const queuedPlayer of queuedPlayers) {
					queuedPlayer.frozen = false;
					queuedPlayer.say("You are now in the game!");
					this.lateJoinQueue.splice(this.lateJoinQueue.indexOf(queuedPlayer, 1));
				}

				if (this.onAddLateJoinQueuedPlayers) {
					try {
						this.onAddLateJoinQueuedPlayers(queuedPlayers);
					} catch (e) {
						console.log(e);
						Tools.logError(e, this.format.name + " onAddLateJoinQueuedPlayers()");
						this.errorEnd();
						return;
					}
				}
			} else {
				player.frozen = true;
				const playersNeeded = this.lateJoinQueueSize! - this.lateJoinQueue.length;
				player.say("You have added to the late-join queue! " + playersNeeded + " more player" +
					(playersNeeded > 1 ? "s need" : " needs") + " to late-join for you to play.");
			}

			return;
		}

		const bits = this.internalGame ? 0 : this.addBits(player, JOIN_BITS, true);
		if (!this.internalGame) {
			player.say("Thanks for joining the " + this.name + " " + this.activityType + "!" + (bits ? " Have some free bits!" : ""));
		}

		if (this.showSignupsHtml && !this.started) {
			if (!this.signupsHtmlTimeout) {
				this.signupsHtmlTimeout = setTimeout(() => {
					this.sayUhtmlChange(this.signupsUhtmlName, this.getSignupsHtmlUpdate());
					this.signupsHtmlTimeout = null;
				}, Client.sendThrottle * 2);
			}
		}

		if (this.started) {
			for (const listener of this.commandsListeners) {
				if (listener.remainingPlayersMax) this.increaseOnCommandsMax(listener, 1);
			}
		} else {
			if (this.playerCap && this.playerCount >= this.playerCap) this.start();
		}

		return player;
	}

	removePlayer(user: User | string, silent?: boolean): void {
		if (this.isMiniGame) return;
		const player = this.destroyPlayer(user);
		if (!player) return;

		if (!silent) {
			player.say("You have left the " + this.name + " " + this.activityType + ".");
		}

		if (this.format.options.freejoin) return;

		if (this.showSignupsHtml && !this.started) {
			if (!this.signupsHtmlTimeout) {
				this.signupsHtmlTimeout = setTimeout(() => {
					this.sayUhtmlChange(this.signupsUhtmlName, this.getSignupsHtmlUpdate());
					this.signupsHtmlTimeout = null;
				}, Client.sendThrottle * 2);
			}
		}

		if (this.commandsListeners.length) {
			const commandsListeners = this.commandsListeners.slice();
			for (const listener of commandsListeners) {
				if (listener.remainingPlayersMax) this.decreaseOnCommandsMax(listener, 1);
			}
		}

		if (this.onRemovePlayer) {
			try {
				this.onRemovePlayer(player);
			} catch (e) {
				console.log(e);
				Tools.logError(e, this.format.name + " onRemovePlayer()");
				this.errorEnd();
				return;
			}
		}

		if (!this.internalGame) this.removeBits(player, JOIN_BITS, silent);
		if (this.usesHtmlPage) player.closeHtmlPage();
	}

	/** Returns `true` if the player has been inactive for the game's inactive round limit */
	addPlayerInactiveRound(player: Player): boolean {
		if (!player.inactiveRounds) player.inactiveRounds = 0;
		player.inactiveRounds++;

		if (this.playerInactiveRoundLimit && player.inactiveRounds >= this.playerInactiveRoundLimit) return true;
		return false;
	}

	eliminatePlayer(player: Player, eliminationCause?: string | null, eliminator?: Player | null): void {
		player.eliminated = true;
		player.say((eliminationCause ? eliminationCause + " " : "") + "You have been eliminated from the game.");

		if (this.onEliminatePlayer) {
			try {
				this.onEliminatePlayer(player, eliminationCause, eliminator);
			} catch (e) {
				console.log(e);
				Tools.logError(e, this.format.name + " onEliminatePlayer()");
				this.errorEnd();
			}
		}
	}

	getCommandsAndAliases(commands: string[]): string[] {
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

	findCommandsListener(commands: string[]): IGameCommandCountListener | null {
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

	increaseOnCommandsMax(commands: string[] | IGameCommandCountListener, increment: number): void {
		let commandListener: IGameCommandCountListener | null = null;
		if (Array.isArray(commands)) {
			commandListener = this.findCommandsListener(commands);
		} else {
			commandListener = commands;
		}
		if (commandListener) commandListener.max += increment;
	}

	decreaseOnCommandsMax(commands: string[] | IGameCommandCountListener, decrement: number): void {
		let commandListener: IGameCommandCountListener | null = null;
		if (Array.isArray(commands)) {
			commandListener = this.findCommandsListener(commands);
		} else {
			commandListener = commands;
		}
		if (commandListener) {
			commandListener.max -= decrement;
			if (commandListener.count >= commandListener.max) {
				commandListener.listener(commandListener.lastUserId);
				this.commandsListeners.splice(this.commandsListeners.indexOf(commandListener, 1));
			}
		}
	}

	onCommands(commands: string[], options: IGameCommandCountOptions, listener: GameCommandListener): void {
		const commandsAndAliases = this.getCommandsAndAliases(commands);
		this.offCommands(commandsAndAliases);
		this.commandsListeners.push(Object.assign(options, {commands: commandsAndAliases, count: 0, lastUserId: '', listener}));
	}

	offCommands(commands: string[]): void {
		const commandListener = this.findCommandsListener(commands);
		if (commandListener) this.commandsListeners.splice(this.commandsListeners.indexOf(commandListener, 1));
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
				if (!this.format.options.freejoin) canUseCommands = false;
			}
		}

		const commandDefinition = this.commands[command];
		if (!canUseCommands && !(!(user.id in this.players) && commandDefinition.spectatorGameCommand) &&
			!(user.id in this.players && this.players[user.id].eliminated && commandDefinition.eliminatedGameCommand) &&
			!(commandDefinition.staffGameCommand && !this.isPm(this.room) && user.hasRank(this.room, 'driver'))) {
			return false;
		}

		const isPm = room === user;
		if (isPm) {
			if (!this.isPm(this.room) && !commandDefinition.pmGameCommand && !commandDefinition.pmOnly) return false;
		} else {
			if (commandDefinition.pmOnly) return false;
		}

		let result: GameCommandReturnType = false;
		try {
			result = commandDefinition.command.call(this, target, room, user, command, timestamp);
		} catch (e) {
			console.log(e);
			Tools.logError(e, this.format.name + " command " + command);
			this.errorEnd();
			return false;
		}

		if (!result) return false;

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
						Tools.logError(e, this.format.name + " command listener for [" + commandListener.commands.join(', ') + "]");
						this.errorEnd();
						return false;
					}

					triggeredListeners.push(commandListener);
				}
				break;
			}
		}

		for (const listener of triggeredListeners) {
			this.commandsListeners.splice(this.commandsListeners.indexOf(listener), 1);
		}

		return result;
	}

	addBits(user: User | Player, bits: number, noPm?: boolean, achievementBits?: boolean): boolean {
		if (this.isPm(this.room) || !Config.rankedGames || !Config.rankedGames.includes(this.room.id) ||
			(this.parentGame && this.parentGame.allowChildGameBits !== true)) return false;

		bits = Math.floor(bits);
		if (bits <= 0) return false;

		if (!achievementBits) {
			if (bits > this.maxBits) bits = this.maxBits;
			if (this.shinyMascot) bits *= 2;
		}

		Storage.addPoints(this.room, Storage.gameLeaderboard, user.name, bits, this.format.id);
		if (!noPm) {
			user.say("You were awarded " + bits + " bits! To see your total amount, use the command ``" + Config.commandCharacter +
				"bits " + this.room.title + "``.");
		}
		if (!this.awardedBits) this.awardedBits = true;
		return true;
	}

	removeBits(user: User | Player, bits: number, noPm?: boolean): boolean {
		if (this.isPm(this.room) || !Config.rankedGames || !Config.rankedGames.includes(this.room.id) ||
			(this.parentGame && this.parentGame.allowChildGameBits !== true)) return false;

		bits = Math.floor(bits);
		if (bits <= 0) return false;
		if (this.shinyMascot) bits *= 2;
		Storage.removePoints(this.room, Storage.gameLeaderboard, user.name, bits, this.format.id);
		if (!noPm) {
			user.say("You lost " + bits + " bits! To see your remaining amount, use the command ``" + Config.commandCharacter + "bits " +
				this.room.title + "``.");
		}
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
				winnings = Math.floor(winnerBits! * points);
			} else {
				winnings = Math.floor(loserBits! * points);
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
			return player.name + (lives ? " (" + lives + ")" : "");
		}, players).join(', ');
	}

	/**Returns an array of players who re-unlocked the achievement, if any */
	unlockAchievement(players: Player | Player[], achievement: IGameAchievement): Player[] | undefined {
		if (this.isPm(this.room) || !Config.allowGameAchievements || !Config.allowGameAchievements.includes(this.room.id) ||
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
	cancelChallenge?(user: User): boolean;
	cleanupTimers?(): void;
	getForceEndMessage?(): string;
	getPlayerSummary?(player: Player): void;
	getRandomAnswer?(): IRandomGameAnswer;
	/** Return `false` to prevent a user from being added to the game (and send the reason to the user) */
	onAddPlayer?(player: Player, lateJoin?: boolean): boolean | undefined;
	onAddLateJoinQueuedPlayers?(players: Player[]): void;
	onAddExistingPlayer?(player: Player): void;
	onAfterDeallocate?(forceEnd: boolean): void;
	onBattleExpire?(room: Room): void;
	/** Return `false` to signal that the battle should be left */
	onBattleFaint?(room: Room, slot: string): boolean;
	onBattlePlayer?(room: Room, slot: string, username: string): void;
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
	onBattleWin?(room: Room, winner: string): void;
	onChildEnd?(winners: Map<Player, number>): void;
	onDeallocate?(forceEnd: boolean): void;
	onEliminatePlayer?(player: Player, eliminationCause?: string | null, eliminator?: Player | null): void;
	onMaxRound?(): void;
	onNextRound?(): void;
	onRemovePlayer?(player: Player): void;
	onSignups?(): void;
	onStart?(): void;
	/** Return `false` to continue the game until another condition is met */
	onTimeLimit?(): boolean;
	parseChatMessage?(user: User, message: string): void;
	rejectChallenge?(user: User): boolean;
	repostInformation?(): void;
	setupChallenge?(challenger: User, challenged: User, format: IGameFormat): void;
}
