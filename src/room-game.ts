import { ICommandDefinition } from "./command-parser";
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

const SIGNUPS_HTML_DELAY = 2 * 1000;

// base of 0 defaults option to 'off'
const defaultOptionValues: Dict<IGameOptionValues> = {
	points: {min: 3, base: 5, max: 10},
	teams: {min: 2, base: 2, max: 4},
	cards: {min: 4, base: 5, max: 6},
	freejoin: {min: 1, base: 0, max: 1},
};

export class Game extends Activity {
	readonly activityType: string = 'game';
	awardedBits: boolean = false;
	canLateJoin: boolean = false;
	readonly commands: Dict<ICommandDefinition<Game>> = Object.assign(Object.create(null), Games.globalGameCommands);
	readonly customizableOptions: Dict<IGameOptionValues> = Object.create(null);
	readonly loserPointsToBits: number = 10;
	readonly maxBits: number = 1000;
	namePrefixes: string[] = [];
	nameSuffixes: string[] = [];
	nameWithOptions: string = '';
	readonly options: Dict<number> = Object.create(null);
	parentGame: Game | null = null;
	round: number = 0;
	signupsTime: number = 0;
	readonly isUserHosted: boolean = false;
	readonly winnerPointsToBits: number = 50;
	readonly winners = new Map<Player, number>();

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
	playerCap?: number;
	readonly points?: Map<Player, number>;
	shinyMascot?: boolean;
	startingLives?: number;
	startingPoints?: number;
	subGameNumber?: number;
	readonly variant?: string;

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
			this.mascot = Dex.getPokemonCopy(Tools.sampleOne(format.mascots));
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
	}

	deallocate() {
		if (!this.started && this.notifyRankSignups) this.sayCommand("/notifyoffrank all");
		if (!this.ended) this.ended = true;
		this.cleanupMessageListeners();
		if (this.onDeallocate) this.onDeallocate();
		if (!this.isUserHosted) this.room.game = null;

		if (this.parentGame) {
			this.room.game = this.parentGame;
			if (this.parentGame.onChildEnd) this.parentGame.onChildEnd(this.winners);
		}
	}

	forceEnd(user: User) {
		if (this.timeout) clearTimeout(this.timeout);
		this.say((!this.isUserHosted ? "The " : "") + this.nameWithOptions + " " + this.activityType + " was forcibly ended.");
		if (this.onForceEnd) this.onForceEnd(user);
		this.ended = true;
		this.deallocate();
	}

	signups() {
		// TODO: check internal/custom signups
		if (!this.isMiniGame) {
			this.showSignupsHtml = true;
			this.sayUhtml(this.uhtmlBaseName + "-signups", this.getSignupsHtml());
			if (!this.isUserHosted) {
				this.notifyRankSignups = true;
				this.sayCommand("/notifyrank all, " + (this.room as Room).title + " scripted game," + this.name + ",Hosting a scriptedgame of " + this.name);
			}
		}
		this.signupsTime = Date.now();
		if (this.shinyMascot) this.say(this.mascot!.name + " is shiny so bits will be doubled!");
		if (this.onSignups) this.onSignups();
		if (this.options.freejoin) {
			this.started = true;
			this.startTime = Date.now();
		}
	}

	nextRound() {
		if (this.timeout) clearTimeout(this.timeout);
		this.round++;
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
		if (this.timeout) clearTimeout(this.timeout);
		if (this.onEnd) this.onEnd();

		let usedDatabase = false;
		if (!this.isPm(this.room) && !this.isMiniGame && !this.parentGame) {
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
		}

		if (this.awardedBits || usedDatabase) Storage.exportDatabase(this.room.id);

		this.deallocate();
	}

	addPlayer(user: User | string): Player | void {
		if (this.options.freejoin || this.isMiniGame) {
			if (typeof user !== 'string') user.say("This game doesn't require you to join.");
			return;
		}
		const player = this.createPlayer(user);
		if (!player) return;
		if ((this.started && (!this.canLateJoin || (this.playerCap && this.playerCount >= this.playerCap) || (this.onAddPlayer && !this.onAddPlayer(player, true)))) ||
			(!this.started && this.onAddPlayer && !this.onAddPlayer(player))) {
			this.removePlayer(user, this.started);
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
		if (!this.started && this.playerCap && this.playerCount >= this.playerCap) this.start();
		return player;
	}

	removePlayer(user: User | string, silent?: boolean) {
		if (this.isMiniGame) return;
		const player = this.destroyPlayer(user);
		if (this.options.freejoin || !player) return;
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
			const gif = Dex.getPokemonGif(this.mascot, this.isUserHosted ? 'back' : 'front');
			if (gif) html += gif + "&nbsp;&nbsp;&nbsp;";
		}
		html += "<b><font size='3'>" + this.nameWithOptions + "</font></b>";
		html += "<br />" + this.description;
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
		if (this.isPm(this.room) || (this.parentGame && !this.parentGame.allowChildGameBits)) return false;
		if (this.shinyMascot) bits *= 2;
		Storage.addPoints(this.room, user.name, bits, this.format.id);
		if (!noPm) user.say("You were awarded " + bits + " bits! To see your total amount, use the command ``" + Config.commandCharacter + "bits " + this.room.title + "``.");
		if (!this.awardedBits) this.awardedBits = true;
		return true;
	}

	removeBits(user: User | Player, bits: number, noPm?: boolean): boolean {
		if (this.isPm(this.room) || (this.parentGame && !this.parentGame.allowChildGameBits)) return false;
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
		return !Tools.random(chance);
	}

	shufflePlayers(players?: PlayerList): Player[] {
		return Tools.shuffle(this.getPlayerList(players));
	}

	getPlayerLives(players?: PlayerList): string {
		return this.getPlayerAttributes(player => {
			const wins = this.lives!.get(player) || this.startingLives;
			return player.name + (wins ? " (" + wins + ")" : "");
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
	/** Return `false` to prevent a user from being added to the game */
	onAddPlayer?(player: Player, lateJoin?: boolean): boolean | void;
	onChildEnd?(winners: Map<Player, number>): void;
	onDeallocate?(): void;
	onInitialize?(): void;
	onNextRound?(): void;
	onRemovePlayer?(player: Player): void;
	onSignups?(): void;
	parseChatMessage?(user: User, message: string, isCommand: boolean): void;
}
