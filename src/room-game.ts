import { CommandsDict } from "./command-parser";
import { PRNG, PRNGSeed } from "./prng";
import { Activity, Player, PlayerList } from "./room-activity";
import { Room } from "./rooms";
import { IGameFormat } from "./types/games";
import { IPokemonCopy } from "./types/in-game-data-types";
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

const SIGNUPS_HTML_DELAY = 2 * 1000;

// base of 0 defaults option to 'off'
const defaultOptionValues: Dict<IGameOptionValues> = {
	points: {min: 3, base: 5, max: 10},
	teams: {min: 2, base: 2, max: 4},
	cards: {min: 4, base: 5, max: 6},
	freejoin: {min: 1, base: 0, max: 1},
};

export abstract class Game extends Activity {
	readonly activityType: string = 'game';
	awardedBits: boolean = false;
	canLateJoin: boolean = false;
	readonly commands: CommandsDict<Game> = Object.assign(Object.create(null), Games.sharedCommands);
	readonly commandsListeners: IGameCommandCountListener[] = [];
	readonly customizableOptions: Dict<IGameOptionValues> = Object.create(null);
	internalGame: boolean = false;
	readonly loserPointsToBits: number = 10;
	readonly maxBits: number = 1000;
	namePrefixes: string[] = [];
	nameSuffixes: string[] = [];
	nameWithOptions: string = '';
	readonly options: Dict<number> = Object.create(null);
	parentGame: Game | null = null;
	prng: PRNG = new PRNG();
	readonly round: number = 0;
	signupsTime: number = 0;
	readonly isUserHosted: boolean = false;
	readonly winnerPointsToBits: number = 50;
	readonly winners = new Map<Player, number>();

	initialSeed: PRNGSeed;

	// set immediately in initialize()
	description!: string;
	format!: IGameFormat;
	inputOptions!: Dict<number>;

	allowChildGameBits?: boolean;
	commandDescriptions?: string[];
	readonly defaultOptions?: DefaultGameOption[];
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

	constructor(room: Room | User, pmRoom?: Room) {
		super(room, pmRoom);

		this.initialSeed = this.prng.initialSeed.slice() as PRNGSeed;
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

	initialize(format: IGameFormat) {
		this.format = format;
		this.inputOptions = this.format.inputOptions;
		this.name = format.name;
		this.id = format.id;
		this.uhtmlBaseName = 'scripted-' + format.id;
		this.description = format.description;
		if (this.maxPlayers) this.playerCap = this.maxPlayers;

		if (format.commands) Object.assign(this.commands, format.commands);
		if (format.commandDescriptions) this.commandDescriptions = format.commandDescriptions;
		if (format.freejoin) {
			this.customizableOptions.freejoin = {
				min: 1,
				base: 1,
				max: 1,
			};
		}
		if (format.mascot) {
			this.mascot = Dex.getPokemonCopy(format.mascot);
		} else if (format.mascots) {
			this.mascot = Dex.getPokemonCopy(this.sampleOne(format.mascots));
		}
		if (format.variant) Object.assign(this, format.variant);
		if (format.mode) format.mode.initialize(this);

		this.setOptions();

		if (this.namePrefixes.length) this.nameWithOptions = this.namePrefixes.join(" ") + " ";
		this.nameWithOptions += this.name;
		if (this.nameSuffixes.length) this.nameWithOptions += " " + this.nameSuffixes.join(" ");

		if (this.onInitialize) this.onInitialize();
	}

	setOptions() {
		if (this.defaultOptions) {
			for (let i = 0; i < this.defaultOptions.length; i++) {
				const defaultOption = this.defaultOptions[i];
				if (defaultOption in this.customizableOptions) continue;
				let base: number;
				if (defaultOptionValues[defaultOption].base === 0) {
					base = 0;
				} else {
					base = defaultOptionValues[defaultOption].base || 5;
				}
				this.customizableOptions[defaultOption] = {
					min: defaultOptionValues[defaultOption].min || 1,
					base,
					max: defaultOptionValues[defaultOption].max || 10,
				};
			}
		}
		for (const i in this.customizableOptions) {
			this.options[i] = this.customizableOptions[i].base;
		}
		for (const i in this.inputOptions) {
			if (!(i in this.customizableOptions) || this.inputOptions[i] === this.options[i]) {
				delete this.inputOptions[i];
				continue;
			}
			if (this.inputOptions[i] < this.customizableOptions[i].min) {
				this.inputOptions[i] = this.customizableOptions[i].min;
			} else if (this.inputOptions[i] > this.customizableOptions[i].max) {
				this.inputOptions[i] = this.customizableOptions[i].max;
			}
			this.options[i] = this.inputOptions[i];
		}

		if (this.inputOptions.points) this.nameSuffixes.push(" (first to " + this.options.points + ")");
		if (this.inputOptions.teams) this.namePrefixes.unshift('' + this.options.teams);
		if (this.inputOptions.cards) this.namePrefixes.unshift(this.inputOptions.cards + "-card");
		if (this.inputOptions.gen) this.namePrefixes.unshift('Gen ' + this.options.gen);
		if (this.inputOptions.ports) this.namePrefixes.unshift(this.inputOptions.ports + '-port');
		if (this.inputOptions.params) this.namePrefixes.unshift(this.inputOptions.params + '-param');
	}

	deallocate(forceEnd: boolean) {
		if (this.timeout) clearTimeout(this.timeout);
		if (this.startTimer) clearTimeout(this.startTimer);
		if (!this.started && this.notifyRankSignups) this.sayCommand("/notifyoffrank all");
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

	forceEnd(user: User) {
		this.say((!this.isUserHosted ? "The " : "") + this.nameWithOptions + " " + this.activityType + " was forcibly ended.");
		if (this.onForceEnd) this.onForceEnd(user);
		this.ended = true;
		this.deallocate(true);
	}

	signups() {
		if (!this.isMiniGame && !this.internalGame) {
			this.showSignupsHtml = true;
			this.sayUhtml(this.uhtmlBaseName + "-signups", this.getSignupsHtml());
			if (!this.isUserHosted) {
				this.notifyRankSignups = true;
				this.sayCommand("/notifyrank all, " + (this.room as Room).title + " scripted game," + this.name + ",Hosting a scriptedgame of " + this.name, true);
			}
		}
		this.signupsTime = Date.now();
		if (this.shinyMascot) this.say(this.mascot!.name + " is shiny so bits will be doubled!");
		if (this.onSignups) this.onSignups();
		if (this.options.freejoin) {
			this.started = true;
			this.startTime = Date.now();
		} else {
			if (Config.gameAutoStartTimers && this.room.id in Config.gameAutoStartTimers) {
				this.startTimer = setTimeout(() => this.start(), Config.gameAutoStartTimers[this.room.id] * 60 * 1000);
			}
		}
	}

	nextRound() {
		if (this.timeout) clearTimeout(this.timeout);
		// @ts-ignore
		this.round++;
		if (this.maxRound && this.round > this.maxRound) {
			if (this.onMaxRound) this.onMaxRound();
			this.end();
			return;
		}
		if (this.onNextRound) this.onNextRound();
	}

	getRoundHtml(getAttributes: (players: PlayerList) => string, players?: PlayerList | null, roundText?: string): string {
		let html = '<div class="infobox">';
		if (this.mascot) {
			html += Dex.getPokemonIcon(this.mascot);
		}
		html += this.nameWithOptions;
		if (this.subGameNumber) html += " - Game " + this.subGameNumber;
		html += " - " + (roundText || "Round " + this.round);

		if (!players) players = this.getRemainingPlayers();
		const remainingPlayerCount = this.getRemainingPlayerCount(players);
		if (remainingPlayerCount > 0) html += "<br />" + (!this.options.freejoin ? "Remaining players" : "Players") + " (" + remainingPlayerCount + "): " + getAttributes.call(this, players);
		html += "</div>";

		return html;
	}

	end() {
		if (this.onEnd) this.onEnd();

		let usedDatabase = false;
		if (!this.isPm(this.room) && !this.isMiniGame && !this.parentGame && !this.internalGame) {
			usedDatabase = true;
			const now = Date.now();
			const database = Storage.getDatabase(this.room);
			if (this.isUserHosted) {
				if (!database.lastUserHostedGameFormatTimes) database.lastUserHostedGameFormatTimes = {};
				database.lastUserHostedGameFormatTimes[this.format.id] = now;
				database.lastUserHostedGameTime = now;
			} else {
				if (!database.lastGameFormatTimes) database.lastGameFormatTimes = {};
				database.lastGameFormatTimes[this.format.id] = now;
				database.lastGameTime = now;
			}

			Games.lastGames[this.room.id] = now;
			if (this.isUserHosted) {
				Games.lastUserHostedGames[this.room.id] = now;
			} else {
				Games.lastScriptedGames[this.room.id] = now;
			}

			if (Config.gameCooldownTimers && this.room.id in Config.gameCooldownTimers) {
				this.say("Game cooldown of " + Config.gameCooldownTimers[this.room.id] + " minutes has started! Minigames can be played in " + (Config.gameCooldownTimers[this.room.id] / 2) + " minutes.");
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

	addPlayer(user: User | string): Player | void {
		if (this.options.freejoin || this.isMiniGame) {
			if (typeof user !== 'string') user.say("This game doesn't require you to join.");
			return;
		}
		const player = this.createPlayer(user);
		if (!player) return;
		if ((this.started && (!this.canLateJoin || (this.playerCap && this.playerCount >= this.playerCap))) || (this.onAddPlayer && !this.onAddPlayer(player, this.started))) {
			this.removePlayer(user, this.started, true);
			return;
		}
		const bits = this.isUserHosted ? 0 : this.addBits(player, 10, true);
		player.say("Thanks for joining the " + this.name + " " + this.activityType + "!" + (bits ? " Have some free bits!" : ""));
		if (this.showSignupsHtml && !this.started) {
			if (this.signupsHtmlTimeout) clearTimeout(this.signupsHtmlTimeout);
			this.signupsHtmlTimeout = setTimeout(() => {
				this.sayUhtmlChange(this.uhtmlBaseName + "-signups", this.getSignupsHtml());
				this.signupsHtmlTimeout = null;
			}, SIGNUPS_HTML_DELAY);
		}
		if (this.started) {
			for (let i = 0; i < this.commandsListeners.length; i++) {
				if (this.commandsListeners[i].remainingPlayersMax) this.increaseOnCommandsMax(this.commandsListeners[i], 1);
			}
		} else {
			if (this.playerCap && this.playerCount >= this.playerCap) this.start();
		}
		return player;
	}

	removePlayer(user: User | string, silent?: boolean, failedLateJoin?: boolean) {
		if (this.isMiniGame) return;
		const player = this.destroyPlayer(user, failedLateJoin);
		if (this.options.freejoin || !player) return;
		if (this.commandsListeners.length) {
			const commandsListeners = this.commandsListeners.slice();
			for (let i = 0; i < commandsListeners.length; i++) {
				if (commandsListeners[i].remainingPlayersMax) this.decreaseOnCommandsMax(commandsListeners[i], 1);
			}
		}
		if (!silent) {
			if (this.onRemovePlayer) this.onRemovePlayer(player);
			this.removeBits(player, 10, true);
			player.say("You have left the " + this.name + " " + this.activityType + ".");
		}
		if (this.showSignupsHtml && !this.started) {
			if (this.signupsHtmlTimeout) clearTimeout(this.signupsHtmlTimeout);
			this.signupsHtmlTimeout = setTimeout(() => {
				this.sayUhtmlChange(this.uhtmlBaseName + "-signups", this.getSignupsHtml());
				this.signupsHtmlTimeout = null;
			}, SIGNUPS_HTML_DELAY);
		}
	}

	getCommandsAndAliases(commands: string[]): string[] {
		const commandsAndAliases: string[] = [];
		for (let i = 0; i < commands.length; i++) {
			const command = commands[i];
			if (!(command in this.commands)) continue;
			const commandDefinition = this.commands[command];
			for (const i in this.commands) {
				if (this.commands[i].command === commandDefinition.command) commandsAndAliases.push(i);
			}
		}
		return commandsAndAliases.sort();
	}

	findCommandsListener(commands: string[]): IGameCommandCountListener | null {
		const commandsAndAliases = this.getCommandsAndAliases(commands);
		let commandListener: IGameCommandCountListener | null = null;
		for (let i = 0; i < this.commandsListeners.length; i++) {
			if (this.commandsListeners[i].commands.length !== commandsAndAliases.length) continue;
			let match = true;
			for (let j = 0; j < this.commandsListeners[i].commands.length; j++) {
				if (this.commandsListeners[i].commands[j] !== commandsAndAliases[j]) {
					match = false;
					break;
				}
			}
			if (match) {
				commandListener = this.commandsListeners[i];
				break;
			}
		}
		return commandListener;
	}

	increaseOnCommandsMax(commands: string[] | IGameCommandCountListener, increment: number) {
		let commandListener: IGameCommandCountListener | null = null;
		if (Array.isArray(commands)) {
			commandListener = this.findCommandsListener(commands);
		} else {
			commandListener = commands;
		}
		if (commandListener) commandListener.max += increment;
	}

	decreaseOnCommandsMax(commands: string[] | IGameCommandCountListener, decrement: number) {
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

	onCommands(commands: string[], options: IGameCommandCountOptions, listener: GameCommandListener) {
		const commandsAndAliases = this.getCommandsAndAliases(commands);
		this.offCommands(commandsAndAliases);
		this.commandsListeners.push(Object.assign(options, {commands: commandsAndAliases, count: 0, lastUserId: '', listener}));
	}

	offCommands(commands: string[]) {
		const commandListener = this.findCommandsListener(commands);
		if (commandListener) this.commandsListeners.splice(this.commandsListeners.indexOf(commandListener, 1));
	}

	tryCommand(target: string, room: Room | User, user: User, command: string) {
		if (!(command in this.commands)) return;
		const commandDefinition = this.commands[command];
		const isPm = room === user;
		if (isPm) {
			if (!commandDefinition.pmGameCommand && !commandDefinition.pmOnly) return;
		} else {
			if (commandDefinition.pmOnly) return;
		}

		if (commandDefinition.command.call(this, target, room, user, command) === false) return;

		const triggeredListeners: IGameCommandCountListener[] = [];
		for (let i = 0; i < this.commandsListeners.length; i++) {
			const commandListener = this.commandsListeners[i];
			for (let i = 0; i < commandListener.commands.length; i++) {
				if (commandListener.commands[i] !== command) continue;
				commandListener.count++;
				commandListener.lastUserId = user.id;

				if (commandListener.count === commandListener.max) {
					commandListener.listener(commandListener.lastUserId);
					triggeredListeners.push(commandListener);
				}
				break;
			}
		}

		for (let i = 0; i < triggeredListeners.length; i++) {
			this.commandsListeners.splice(this.commandsListeners.indexOf(triggeredListeners[i]), 1);
		}
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
		html += "<h3>" + this.nameWithOptions + "</h3>" + this.description;
		let commandDescriptions: string[] = [];
		if (this.getPlayerSummary) commandDescriptions.push(Config.commandCharacter + "summary");
		if (this.commandDescriptions) commandDescriptions = commandDescriptions.concat(this.commandDescriptions);
		if (commandDescriptions.length) {
			html += "<br /><b>Command" + (commandDescriptions.length > 1 ? "s" : "") + "</b>: " + commandDescriptions.map(x => "<code>" + x + "</code>").join(", ");
		}
		if (this.options.freejoin) {
			html += "<br /><br /><b>This game is free-join!</b>";
		} else {
			html += "<br /><br /><b>Players (" + this.playerCount + ")</b>: " + this.getPlayerNames();
			if (this.started) {
				html += "<br /><br /><b>The game has started!</b>";
			} else {
				html += "<br /><button class='button' name='send' value='/pm " + Users.self.name + ", " + Config.commandCharacter + "joingame " + this.room.id + "'>Join</button>";
			}
		}
		html += "</center></div>";
		return html;
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

	convertPointsToBits(winnerBits?: number, loserBits?: number) {
		if (this.parentGame && !this.parentGame.allowChildGameBits) return;
		if (!this.points) throw new Error(this.name + " called convertPointsToBits() with no points Map");
		if (!winnerBits) winnerBits = this.winnerPointsToBits;
		if (!loserBits) loserBits = this.loserPointsToBits;
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

	getPlayerSummary?(player: Player): void;
	/** Return `false` to prevent a user from being added to the game (and send the reason to the user) */
	onAddPlayer?(player: Player, lateJoin?: boolean): boolean | void;
	onAfterDeallocate?(forceEnd: boolean): void;
	onChildEnd?(winners: Map<Player, number>): void;
	onDeallocate?(forceEnd: boolean): void;
	onInitialize?(): void;
	onMaxRound?(): void;
	onNextRound?(): void;
	onRemovePlayer?(player: Player): void;
	onSignups?(): void;
	parseChatMessage?(user: User, message: string, isCommand: boolean): void;
}
