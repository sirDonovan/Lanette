import { CommandsDict } from "./command-parser";
import { PRNG, PRNGSeed } from "./prng";
import { Activity, Player, PlayerList, PlayerTeam } from "./room-activity";
import { Room } from "./rooms";
import { IGameAchievement, IGameFormat, IGameMode, IGameVariant, IUserHostedFormat } from "./types/games";
import { IPokemonCopy } from "./types/dex";
import { User } from "./users";

export type DefaultGameOption = 'points' | 'teams' | 'cards' | 'freejoin';
export interface IGameOptionValues {
	min: number;
	base: number;
	max: number;
}

type GameCommandListener = (lastUserid: string) => void;
interface IGameCommandCountOptions {
	max: number;
	remainingPlayersMax?: boolean;
}
interface IGameCommandCountListener extends IGameCommandCountOptions {
	commands: string[];
	count: number;
	lastUserId: string;
	listener: GameCommandListener;
}

const JOIN_BITS = 10;
const SIGNUPS_HTML_DELAY = 1 * 1000;

const teamNameLists: Dict<string[][]> = {
	'2': [["Red", "Blue"], ["Gold", "Silver"], ["Ruby", "Sapphire"], ["Diamond", "Pearl"], ["Black", "White"], ["X", "Y"], ["Sun", "Moon"], ["Sword", "Shield"], ["Land", "Sea"],
		["Time", "Space"], ["Yin", "Yang"], ["Life", "Destruction"], ["Sunne", "Moone"]],
	'3': [["Red", "Blue", "Yellow"], ["Gold", "Silver", "Crystal"], ["Ruby", "Sapphire", "Emerald"], ["Diamond", "Pearl", "Platinum"], ["Land", "Sea", "Sky"],
		["Time", "Space", "Antimatter"], ["Yin", "Yang", "Wuji"], ["Life", "Destruction", "Order"], ["Sunne", "Moone", "Prism"]],
	'4': [["Red", "Blue", "Yellow", "Green"], ["Fall", "Winter", "Spring", "Summer"], ["Water", "Fire", "Earth", "Air"], ["Clubs", "Spades", "Hearts", "Diamonds"]],
};

// base of 0 defaults option to 'off'
const defaultOptionValues: Dict<IGameOptionValues> = {
	points: {min: 10, base: 10, max: 10},
	teams: {min: 2, base: 2, max: 4},
	cards: {min: 4, base: 5, max: 6},
	freejoin: {min: 1, base: 0, max: 1},
};

export class Game extends Activity {
	readonly activityType: string = 'game';
	awardedBits: boolean = false;
	canLateJoin: boolean = false;
	readonly commands: CommandsDict<Game> = Object.assign(Object.create(null), Games.sharedCommands);
	readonly commandsListeners: IGameCommandCountListener[] = [];
	internalGame: boolean = false;
	readonly isUserHosted: boolean = false;
	readonly loserPointsToBits: number = 10;
	readonly maxBits: number = 1000;
	minPlayers: number = 4;
	notifyRankSignups: boolean = false;
	parentGame: Game | null = null;
	readonly round: number = 0;
	signupsTime: number = 0;
	usesWorkers: boolean = false;
	readonly winnerPointsToBits: number = 50;
	readonly winners = new Map<Player, number>();

	prng: PRNG;
	initialSeed: PRNGSeed;

	// set in initialize()
	description!: string;
	format!: IGameFormat | IUserHostedFormat;
	signupsUhtmlName!: string;
	joinLeaveButtonUhtmlName!: string;

	allowChildGameBits?: boolean;
	commandDescriptions?: string[];
	isMiniGame?: boolean;
	readonly lives?: Map<Player, number>;
	mascot?: IPokemonCopy;
	maxPlayers?: number;
	maxRound?: number;
	playerCap?: number;
	readonly points?: Map<Player, number>;
	shinyMascot?: boolean;
	startingLives?: number;
	startingPoints?: number;
	subGameNumber?: number;
	readonly variant?: string;

	constructor(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed) {
		super(room, pmRoom);

		this.prng = new PRNG(initialSeed);
		this.initialSeed = this.prng.initialSeed.slice() as PRNGSeed;
	}

	static setOptions<T extends Game>(format: IGameFormat<T>, mode: IGameMode | undefined, variant: IGameVariant | undefined): Dict<number> {
		const namePrefixes: string[] = [];
		const nameSuffixes: string[] = [];
		if (format.freejoin || (variant && variant.freejoin)) {
			format.customizableOptions.freejoin = {
				min: 1,
				base: 1,
				max: 1,
			};
		}
		if (mode && mode.class.setOptions) mode.class.setOptions(format, namePrefixes, nameSuffixes);

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
			if (!(i in format.customizableOptions)) {
				delete format.inputOptions[i];
				continue;
			}
			if (format.inputOptions[i] === format.customizableOptions[i].base) continue;

			if (format.inputOptions[i] < format.customizableOptions[i].min) {
				format.inputOptions[i] = format.customizableOptions[i].min;
			} else if (format.inputOptions[i] > format.customizableOptions[i].max) {
				format.inputOptions[i] = format.customizableOptions[i].max;
			}

			options[i] = format.inputOptions[i];
			customizedOptions[i] = format.inputOptions[i];
		}

		if (customizedOptions.points) nameSuffixes.push(" (first to " + customizedOptions.points + ")");
		if (customizedOptions.teams) namePrefixes.unshift('' + customizedOptions.teams);
		if (customizedOptions.cards) namePrefixes.unshift(customizedOptions.cards + "-card");
		if (customizedOptions.gen) namePrefixes.unshift('Gen ' + customizedOptions.gen);
		if (customizedOptions.ports) namePrefixes.unshift(customizedOptions.ports + '-port');
		if (customizedOptions.params) namePrefixes.unshift(customizedOptions.params + '-param');

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

	random(m: number): number {
		return Tools.random(m, this.prng);
	}

	sampleMany<T>(array: readonly T[], amount: number | string): T[] {
		return Tools.sampleMany(array, amount, this.prng);
	}

	sampleOne<T>(array: readonly T[]): T {
		return Tools.sampleOne(array, this.prng);
	}

	shuffle<T>(array: readonly T[]): T[] {
		return Tools.shuffle(array, this.prng);
	}

	setUhtmlBaseName(gameType: 'scripted' | 'userhosted'): void {
		const counts = gameType === 'scripted' ? Games.uhtmlScriptedCounts : Games.uhtmlUserHostedCounts;
		if (!(this.id in counts)) counts[this.id] = 0;
		counts[this.id]++;
		this.uhtmlBaseName = gameType + '-' + this.id + '-' + counts[this.id];
		this.signupsUhtmlName = this.uhtmlBaseName + "-signups";
		this.joinLeaveButtonUhtmlName = this.uhtmlBaseName + "-join-leave";
	}

	initialize(format: IGameFormat | IUserHostedFormat): void {
		this.format = format;
		this.name = format.nameWithOptions || format.name;
		this.id = format.id;
		this.description = format.description;
		if (this.maxPlayers) this.playerCap = this.maxPlayers;

		this.onInitialize();
	}

	onInitialize(): void {
		this.setUhtmlBaseName('scripted');

		const format = this.format as IGameFormat;
		if (format.commands) Object.assign(this.commands, format.commands);
		if (format.commandDescriptions) this.commandDescriptions = format.commandDescriptions;
		if (format.mascot) {
			this.mascot = Dex.getPokemonCopy(format.mascot);
		} else if (format.mascots) {
			this.mascot = Dex.getPokemonCopy(this.sampleOne(format.mascots));
		}
		if (format.variant) {
			delete format.variant.name;
			Object.assign(this, format.variant);
		}
		if (format.mode) format.mode.initialize(this);
	}

	deallocate(forceEnd: boolean): void {
		if (this.timeout) clearTimeout(this.timeout);
		if (this.startTimer) clearTimeout(this.startTimer);
		if ((!this.started || this.format.options.freejoin) && this.notifyRankSignups) this.sayCommand("/notifyoffrank all");
		if (!this.ended) this.ended = true;
		this.cleanupMessageListeners();
		if (this.onDeallocate) this.onDeallocate(forceEnd);
		if (!this.isUserHosted) this.room.game = null;

		if (this.parentGame) {
			this.room.game = this.parentGame;
			if (this.parentGame.onChildEnd) this.parentGame.onChildEnd(this.winners);
		}

		if (this.onAfterDeallocate) this.onAfterDeallocate(forceEnd);
	}

	forceEnd(user: User, reason?: string): void {
		this.say((!this.isUserHosted ? "The " : "") + this.name + " " + this.activityType + " was forcibly ended.");
		if (this.onForceEnd) this.onForceEnd(user, reason);
		this.ended = true;
		this.deallocate(true);
	}

	signups(): void {
		if (!this.isMiniGame && !this.internalGame) {
			this.showSignupsHtml = true;
			this.sayUhtml(this.signupsUhtmlName, this.getSignupsHtml());

			let joinLeaveHtml = "<center>";
			if (this.format.options.freejoin) {
				joinLeaveHtml += "<b>This game is free-join!</b>";
			} else {
				joinLeaveHtml += "<button class='button' name='send' value='/pm " + Users.self.name + ", " + Config.commandCharacter + "joingame " +
					this.room.id + "'>Join game</button>";
				joinLeaveHtml += " | ";
				joinLeaveHtml += "<button class='button' name='send' value='/pm " + Users.self.name + ", " + Config.commandCharacter + "leavegame " +
					this.room.id + "'>Leave game</button>";
			}
			joinLeaveHtml += "</center>";
			this.sayUhtml(this.joinLeaveButtonUhtmlName, joinLeaveHtml);
	
			if (!this.isUserHosted) {
				this.notifyRankSignups = true;
				this.sayCommand("/notifyrank all, " + (this.room as Room).title + " scripted game," + this.name + "," + Games.scriptedGameHighlight + " " + this.name, true);
			}
		}
		this.signupsTime = Date.now();
		if (this.shinyMascot) this.say(this.mascot!.name + " is shiny so bits will be doubled!");
		if (this.onSignups) this.onSignups();
		if (this.format.options.freejoin) {
			this.started = true;
			this.startTime = Date.now();
		} else if (!this.internalGame && !this.isUserHosted && !this.isMiniGame) {
			if (Config.gameAutoStartTimers && this.room.id in Config.gameAutoStartTimers) {
				const startTimer = Config.gameAutoStartTimers[this.room.id] * 60 * 1000;
				this.startTimer = setTimeout(() => {
					if (!this.start()) {
						this.startTimer = setTimeout(() => {
							if (!this.start()) {
								this.say("Ending the game due to a lack of players.");
								this.deallocate(false);
							}
						}, startTimer);
					}
				}, startTimer);
			}
		}

		if (this.isMiniGame) {
			if ((this.format as IGameFormat).minigameDescription) this.say((this.format as IGameFormat).minigameDescription!);
			this.nextRound();
		}
	}

	start(): boolean {
		if (this.minPlayers && this.playerCount < this.minPlayers) return false;
		if (this.startTimer) clearTimeout(this.startTimer);
		if (this.notifyRankSignups) this.sayCommand("/notifyoffrank all");
		this.started = true;
		this.startTime = Date.now();
		if (this.showSignupsHtml) {
			if (this.signupsHtmlTimeout) clearTimeout(this.signupsHtmlTimeout);
			this.sayUhtmlChange(this.signupsUhtmlName, this.getSignupsHtml());
			this.sayUhtmlChange(this.joinLeaveButtonUhtmlName, "<center><b>The game has started!</b></center>");
		}

		this.say(this.name + " is starting! **Players (" + this.playerCount + ")**: " + this.getPlayerNames());
		if (this.onStart) this.onStart();
		return true;
	}

	nextRound(): void {
		if (this.timeout) clearTimeout(this.timeout);
		// @ts-expect-error
		this.round++;
		if (this.maxRound && this.round > this.maxRound) {
			if (this.onMaxRound) this.onMaxRound();
			if (!this.ended) this.end();
			return;
		}
		if (this.onNextRound) this.onNextRound();
	}

	getRoundHtml(getAttributes: (players: PlayerList) => string, players?: PlayerList | null, roundText?: string, attributeText?: string): string {
		let html = '<div class="infobox">';
		if (this.mascot) {
			html += Dex.getPokemonIcon(this.mascot);
		}
		html += "<span style='color: #999999'>" + this.name;
		if (this.subGameNumber) html += " - Game " + this.subGameNumber;
		html += " - " + (roundText || "Round " + this.round) + "</span>";

		if (!players) players = this.getRemainingPlayers();
		const attributes = getAttributes.call(this, players);

		if (!attributeText) {
			const remainingPlayerCount = this.getRemainingPlayerCount(players);
			if (remainingPlayerCount > 0) attributeText = (!this.format.options.freejoin ? "Remaining players" : "Players") + " (" + remainingPlayerCount + ")";
		}

		if (attributes || attributeText) html += "<br /><br />" + (attributeText ? attributeText : "") + (attributes ? (attributeText ? ": " : "") + attributes : "");
		html += "</div>";

		return html;
	}

	end(): void {
		if (this.onEnd) this.onEnd();
		if (this.isPm(this.room)) {
			this.deallocate(false);
			return;
		}

		const now = Date.now();
		let usedDatabase = false;

		if (this.isMiniGame) {
			Games.lastMinigames[this.room.id] = now;
		} else if (!this.parentGame && !this.internalGame) {
			usedDatabase = true;
			const database = Storage.getDatabase(this.room);

			Games.lastGames[this.room.id] = now;
			let lastFormatTimesKey: 'lastGameFormatTimes' | 'lastUserHostedGameFormatTimes';
			let pastGamesKey: 'pastGames' | 'pastUserHostedGames';
			if (this.isUserHosted) {
				Games.lastUserHostedGames[this.room.id] = now;
				lastFormatTimesKey = 'lastUserHostedGameFormatTimes';
				pastGamesKey = 'pastUserHostedGames';

				database.lastUserHostedGameTime = now;
			} else {
				Games.lastScriptedGames[this.room.id] = now;
				lastFormatTimesKey = 'lastGameFormatTimes';
				pastGamesKey = 'pastGames';

				database.lastGameTime = now;
			}

			if (!database[lastFormatTimesKey]) database[lastFormatTimesKey] = {};
			database[lastFormatTimesKey]![this.format.id] = now;

			if (!database[pastGamesKey]) database[pastGamesKey] = [];
			database[pastGamesKey]!.unshift({inputTarget: this.format.inputTarget, name: this.name, time: now});
			while (database[pastGamesKey]!.length > 8) {
				database[pastGamesKey]!.pop();
			}

			if (Config.gameCooldownTimers && this.room.id in Config.gameCooldownTimers) {
				this.say("Game cooldown of " + Config.gameCooldownTimers[this.room.id] + " minutes has started! Minigames can be played in " +
					(Config.gameCooldownTimers[this.room.id] / 2) + " minutes.");
			}

			if (Config.gameAutoCreateTimers && this.room.id in Config.gameAutoCreateTimers) {
				let autoCreateTimer = Config.gameAutoCreateTimers[this.room.id];
				if (Config.gameCooldownTimers && this.room.id in Config.gameCooldownTimers) autoCreateTimer += Config.gameCooldownTimers[this.room.id];
				Games.setAutoCreateTimer(this.room, this.isUserHosted ? 'scripted' : 'userhosted', autoCreateTimer * 60 * 1000);
			}
		}

		if (this.awardedBits || usedDatabase) Storage.exportDatabase(this.room.id);

		this.deallocate(false);
	}

	addPlayer(user: User): Player | undefined {
		if (this.format.options.freejoin || this.isMiniGame) {
			user.say("This game does not require you to join.");
			return;
		}

		const player = this.createPlayer(user);
		if (!player) return;
		if ((this.started && (!this.canLateJoin || (this.playerCap && this.playerCount >= this.playerCap))) || (this.onAddPlayer && !this.onAddPlayer(player, this.started))) {
			this.destroyPlayer(user, true);
			return;
		}

		const bits = this.isUserHosted ? 0 : this.addBits(player, JOIN_BITS, true);
		player.say("Thanks for joining the " + this.name + " " + this.activityType + "!" + (bits ? " Have some free bits!" : ""));

		if (this.showSignupsHtml && !this.started) {
			if (!this.signupsHtmlTimeout) {
				this.signupsHtmlTimeout = setTimeout(() => {
					this.sayUhtmlChange(this.signupsUhtmlName, this.getSignupsHtml());
					this.signupsHtmlTimeout = null;
				}, SIGNUPS_HTML_DELAY);
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
		if (this.format.options.freejoin || !player) return;

		if (this.commandsListeners.length) {
			const commandsListeners = this.commandsListeners.slice();
			for (const listener of commandsListeners) {
				if (listener.remainingPlayersMax) this.decreaseOnCommandsMax(listener, 1);
			}
		}

		if (this.onRemovePlayer) this.onRemovePlayer(player);
		if (!this.isUserHosted) this.removeBits(player, JOIN_BITS, silent);

		if (!silent) {
			player.say("You have left the " + this.name + " " + this.activityType + ".");
		}

		if (this.showSignupsHtml && !this.started) {
			if (!this.signupsHtmlTimeout) {
				this.signupsHtmlTimeout = setTimeout(() => {
					this.sayUhtmlChange(this.signupsUhtmlName, this.getSignupsHtml());
					this.signupsHtmlTimeout = null;
				}, SIGNUPS_HTML_DELAY);
			}
		}
	}

	eliminatePlayer(player: Player, eliminationCause?: string | null, eliminator?: Player | null): void {
		player.eliminated = true;
		player.say((eliminationCause ? eliminationCause + " " : "") + "You have been eliminated from the game.");
		if (this.onEliminatePlayer) this.onEliminatePlayer(player, eliminationCause, eliminator);
	}

	getCommandsAndAliases(commands: string[]): string[] {
		const commandsAndAliases: string[] = [];
		for (const command of commands) {
			if (!(command in this.commands)) continue;
			const commandDefinition = this.commands[command];
			for (const i in this.commands) {
				if ((commandDefinition.asyncCommand && this.commands[i].asyncCommand === commandDefinition.asyncCommand) ||
					(commandDefinition.command && this.commands[i].command === commandDefinition.command)) {
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
			if (commandListener.count === commandListener.max) {
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

	async tryCommand(target: string, room: Room | User, user: User, command: string): Promise<boolean> {
		if (!(command in this.commands)) return false;
		const commandDefinition = this.commands[command];
		const isPm = room === user;
		if (isPm) {
			if (!commandDefinition.pmGameCommand && !commandDefinition.pmOnly) return false;
		} else {
			if (commandDefinition.pmOnly) return false;
		}

		let result: boolean;
		if (commandDefinition.asyncCommand) {
			result = await commandDefinition.asyncCommand.call(this, target, room, user, command);
		} else {
			result = commandDefinition.command!.call(this, target, room, user, command);
		}

		if (result === false) return false;

		const triggeredListeners: IGameCommandCountListener[] = [];
		for (const commandListener of this.commandsListeners) {
			for (const listenerCommand of commandListener.commands) {
				if (listenerCommand !== command) continue;
				commandListener.count++;
				commandListener.lastUserId = user.id;

				if (commandListener.count === commandListener.max) {
					commandListener.listener(commandListener.lastUserId);
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

	getSignupsHtml(): string {
		let html = "<div class='infobox'><center>";
		if (this.mascot) {
			if (this.shinyMascot === undefined) {
				if (this.rollForShinyPokemon()) {
					this.mascot.shiny = true;
					this.shinyMascot = true;
				} else {
					this.shinyMascot = false;
				}
			}
			const gif = Dex.getPokemonGif(this.mascot, "xy", this.isUserHosted ? 'back' : 'front');
			if (gif) html += gif;
		}
		html += "<h3>" + this.name + "</h3>" + this.description;
		let commandDescriptions: string[] = [];
		if (this.getPlayerSummary) commandDescriptions.push(Config.commandCharacter + "summary");
		if (this.commandDescriptions) commandDescriptions = commandDescriptions.concat(this.commandDescriptions);
		if (commandDescriptions.length) {
			html += "<br /><b>Command" + (commandDescriptions.length > 1 ? "s" : "") + "</b>: " + commandDescriptions.map(x => "<code>" + x + "</code>").join(", ");
		}
		if (!this.format.options.freejoin) {
			html += "<br /><br /><b>Players (" + this.playerCount + ")</b>: " + this.getPlayerNames();
		}
		html += "</center></div>";
		return html;
	}

	announceWinners(): void {
		const len = this.winners.size;
		if (len) {
			this.say("**Winner" + (len > 1 ? "s" : "") + "**: " + this.getPlayerNames(this.winners));
		} else {
			this.say("No winners this game!");
		}
	}

	addBits(user: User | Player, bits: number, noPm?: boolean): boolean {
		if (bits <= 0 || this.isPm(this.room) || (this.parentGame && !this.parentGame.allowChildGameBits)) return false;
		if (this.shinyMascot) bits *= 2;
		Storage.addPoints(this.room, user.name, bits, this.format.id);
		if (!noPm) user.say("You were awarded " + bits + " bits! To see your total amount, use the command ``" + Config.commandCharacter + "bits " + this.room.title + "``.");
		if (!this.awardedBits) this.awardedBits = true;
		return true;
	}

	removeBits(user: User | Player, bits: number, noPm?: boolean): boolean {
		if (bits <= 0 || this.isPm(this.room) || (this.parentGame && !this.parentGame.allowChildGameBits)) return false;
		if (this.shinyMascot) bits *= 2;
		Storage.removePoints(this.room, user.name, bits, this.format.id);
		if (!noPm) user.say("You lost " + bits + " bits! To see your remaining amount, use the command ``" + Config.commandCharacter + "bits " + this.room.title + "``.");
		return true;
	}

	convertPointsToBits(winnerBits?: number, loserBits?: number): void {
		if (this.parentGame && !this.parentGame.allowChildGameBits) return;
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
			if (winnings > this.maxBits) winnings = this.maxBits;
			if (winnings) this.addBits(player, winnings);
		});
	}

	unlockAchievement(players: Player | Player[], achievement: IGameAchievement): void {
		if (this.isMiniGame || this.isPm(this.room)) return;
		const format = this.format as IGameFormat;
		if (format.mode && format.mode.id !== achievement.mode) return;

		const database = Storage.getDatabase(this.room);
		if (!database.gameAchievements) database.gameAchievements = {};

		const unlocked: Player[] = [];
		if (!Array.isArray(players)) players = [players];

		const achievementId = Tools.toId(achievement.name);
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

			unlocked.push(player);
			this.addBits(player, repeat ? achievement.repeatBits! : achievement.bits);
		}

		if (!unlocked.length) return;

		this.say(Tools.joinList(unlocked.map(x => x.name), "**") + " unlocked the **" + achievement.name + "** achievement!");
	}

	rollForShinyPokemon(extraChance?: number): boolean {
		let chance = 150;
		if (extraChance) chance -= extraChance;
		return !this.random(chance);
	}

	shufflePlayers(players?: PlayerList): Player[] {
		return this.shuffle(this.getPlayerList(players));
	}

	getRandomPlayer(players?: PlayerList): Player {
		return this.players[this.sampleOne(Object.keys(this.getRemainingPlayers(players)))];
	}

	generateTeams(numberOfTeams: number, players?: PlayerList): Dict<PlayerTeam> {
		const teams: Dict<PlayerTeam> = {};
		const playerList = this.shufflePlayers(players);
		const teamNames = this.sampleOne(teamNameLists['' + numberOfTeams]);
		const teamIds: string[] = [];

		for (let i = 0; i < numberOfTeams; i++) {
			const id = Tools.toId(teamNames[i]);
			teams[id] = new PlayerTeam(teamNames[i]);
			teamIds.push(id);
		}

		while (playerList.length) {
			for (let i = 0; i < numberOfTeams; i++) {
				const player = playerList.shift();
				if (!player) break;
				teams[teamIds[i]].players.push(player);
				player.team = teams[teamIds[i]];
			}
		}

		return teams;
	}

	getPlayerLives(players?: PlayerList): string {
		return this.getPlayerAttributes(player => {
			const lives = this.lives!.get(player) || this.startingLives;
			return player.name + (lives ? " (" + lives + ")" : "");
		}, players).join(', ');
	}

	getPlayerPoints(players?: PlayerList): string {
		return this.getPlayerAttributes(player => {
			const points = this.points!.get(player) || this.startingPoints;
			return player.name + (points ? " (" + points + ")" : "");
		}, players).join(', ');
	}

	getPlayerWins(players?: PlayerList): string {
		return this.getPlayerAttributes(player => {
			const wins = this.winners.get(player);
			return player.name + (wins ? " (" + wins + ")" : "");
		}, players).join(', ');
	}

	getTeamPlayers(teams: Dict<PlayerTeam>, players?: PlayerList): Dict<string[]> {
		players = this.getPlayerList(players);
		const teamPlayers: Dict<string[]> = {};
		for (const i in teams) {
			const team = teams[i];
			teamPlayers[team.id] = [];
			for (const player of team.players) {
				if (players.includes(player)) teamPlayers[team.id].push(player.name);
			}
		}

		return teamPlayers;
	}

	getTeamPlayerNames(teams: Dict<PlayerTeam>, players?: PlayerList): string {
		const teamPlayers = this.getTeamPlayers(teams, players);

		const output: string[] = [];
		const teamKeys = Object.keys(teams).sort();
		for (const key of teamKeys) {
			output.push("<b>" + teams[key].name + "</b>: " + Tools.joinList(teamPlayers[key]));
		}
		return output.join(" | ");
	}

	getPlayerSummary?(player: Player): void;
	/** Return `false` to prevent a user from being added to the game (and send the reason to the user) */
	onAddPlayer?(player: Player, lateJoin?: boolean): boolean | void;
	onAfterDeallocate?(forceEnd: boolean): void;
	onChildEnd?(winners: Map<Player, number>): void;
	onDeallocate?(forceEnd: boolean): void;
	onEliminatePlayer?(player: Player, eliminationCause?: string | null, eliminator?: Player | null): void;
	onMaxRound?(): void;
	onNextRound?(): void;
	onRemovePlayer?(player: Player): void;
	onSignups?(): void;
	onStart?(): void;
	parseChatMessage?(user: User, message: string): void;
}
