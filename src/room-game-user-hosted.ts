import { CLOSE_COMMAND } from "./html-pages/html-page-base";
import type { Player } from "./room-activity";
import { Game } from "./room-game";
import type { Room } from "./rooms";
import type { GameDifficulty, IUserHostedFile, IUserHostedFormat } from "./types/games";
import type { User } from "./users";

const FIRST_ACTIVITY_WARNING = 5 * 60 * 1000;
const SECOND_ACTIVITY_WARNING = 30 * 1000;
const MIN_HOST_EXTENSION_MINUTES = 1;
const MAX_HOST_EXTENSION_MINUTES = 2;
const FORCE_END_CREATE_TIMER = 60 * 1000;
const HOST_TIME_LIMIT = 25 * 60 * 1000;

export class UserHostedGame extends Game {
	endTime: number = 0;
	extended: boolean = false;
	gameTimer: NodeJS.Timer | null = null;
	gameTimerEndTime: number = 0;
	hostId: string = '';
	hostName: string = '';
	hostTimeout: NodeJS.Timer | null = null;
	isUserHosted: boolean = true;
	mascots: string[] = [];
	noControlPanel: boolean = false;
	notifyRankSignups: boolean = true;
	readonly points = new Map<Player, number>();
	savedWinners: Player[] = [];
	scoreCap: number = 0;
	shinyMascot: boolean = false;
	showSignupsHtml = true;
	storedMessages: Dict<string> | null = null;
	subHostId: string | null = null;
	subHostName: string | null = null;
	twist: string | null = null;
	updatedDatabase: boolean = false;

	// set in onInitialize()
	declare format: IUserHostedFormat;

	declare readonly room: Room;

	reset(): void {
		this.cleanupTimers();
		this.clearHangman();
		this.clearSignupsNotification();

		this.points.clear();
		this.winners.clear();

		this.endTime = 0;
		this.mascots = [];
		this.savedWinners = [];
		this.scoreCap = 0;
		this.shinyMascot = false;
		this.storedMessages = null;
		this.subHostId = null;
		this.subHostName = null;
		this.twist = null;

		this.started = false;
		this.startTime = 0;
		this.minPlayers = 4;
		this.players = {};
		this.playerCount = 0;
		this.teams = null;
	}

	restart(format: IUserHostedFormat): void {
		this.reset();

		this.format = format;
		this.onInitialize();
		this.id = format.id;

		this.setHost(this.hostName);
		this.signups();
	}

	extend(target: string, user: User): string | undefined {
		if (this.extended) return "The game cannot be extended more than once.";

		const now = Date.now();
		if (this.endTime - now > FIRST_ACTIVITY_WARNING) {
			return "You cannot extend the game if there are more than " + (FIRST_ACTIVITY_WARNING / 60 / 1000) + " minutes remaining.";
		}

		const minutes = parseFloat(target);
		if (isNaN(minutes) || minutes < MIN_HOST_EXTENSION_MINUTES || minutes > MAX_HOST_EXTENSION_MINUTES) {
			return "You must specify an extension time between " + MIN_HOST_EXTENSION_MINUTES + " and " +
				MAX_HOST_EXTENSION_MINUTES + " minutes.";
		}

		this.endTime += minutes * 60 * 1000;
		this.extended = true;
		this.setSecondActivityTimer();

		const extension = minutes + " minute" + (minutes === 1 ? "" : "s");
		this.say((this.subHostName || this.hostName) + " your game has been extended by " + extension + ".");
		if (!this.subHostName) this.room.modnote(user.name + " extended " + this.hostName + "'s game by " + extension + ".");
	}

	// Display
	getMascotIcons(): string {
		const icons: string[] = [];
		for (const mascot of this.mascots) {
			const icon = Dex.getPokemonIcon(Dex.getExistingPokemon(mascot));
			if (icon) icons.push(icon);
		}

		return icons.join("");
	}

	getMascotAndNameHtml(additionalText?: string): string {
		return this.getMascotIcons() + "<b>" + this.name + (additionalText || "") + "</b>";
	}

	// Host
	setHost(host: User | string, noControlPanel?: boolean): void {
		if (typeof host === 'string') {
			this.hostId = Tools.toId(host);
			this.hostName = host;
		} else {
			this.hostId = host.id;
			this.hostName = host.name;
		}

		this.mascots = [];
		const database = Storage.getDatabase(this.room);
		if (database.gameHostBoxes && this.hostId in database.gameHostBoxes && Config.showGameHostBoxes &&
			Config.showGameHostBoxes.includes(this.room.id)) {
			for (const choice of database.gameHostBoxes[this.hostId].pokemon) {
				const pokemon = Dex.getPokemon(choice.pokemon);
				if (pokemon) {
					this.mascots.push(pokemon.name);
				}
			}
		}

		if (this.mascots.length) {
			const mascotPrefix = Games.getFormatMascotPrefix(this.format);
			let formatName = this.format.name;
			if (mascotPrefix) {
				let team = false;
				if (formatName.startsWith("Team ")) {
					team = true;
					formatName = formatName.substr(5);
				}

				formatName = formatName.substr(mascotPrefix.length);
				if (team) formatName = "Team " + formatName;
			}

			this.name = this.hostName + "'s " + formatName;
		} else {
			this.name = this.hostName + "'s " + this.format.name;
		}

		if (noControlPanel) {
			this.noControlPanel = true;
		} else {
			this.sendControlPanelButton();
		}
	}

	setSubHost(user: User): void {
		this.subHostId = user.id;
		this.subHostName = user.name;

		this.sendControlPanelButton();
	}

	sendControlPanelButton(): void {
		if (this.noControlPanel) return;

		const user = Users.get(this.subHostName || this.hostName);
		if (user) {
			this.room.pmHtml(user, "To assist with your game, try using the <b>Host Control Panel</b>! It allows you to manage " +
				"attributes of your game, display trainers & Pokemon, and generate hints.<br /><br />" +
				Client.getPmSelfButton(Config.commandCharacter + CommandParser.getGameHtmlPages().gameHostControlPanel.baseCommand +
				" " + this.room.title, "Open panel"));
		}
	}

	autoRefreshControlPanel(): void {
		if (this.noControlPanel) return;

		const user = Users.get(this.subHostName || this.hostName);
		if (user) {
			const panel = CommandParser.getGameHtmlPages().gameHostControlPanel;
			CommandParser.parse(user, user, Config.commandCharacter + panel.baseCommand + " " + this.room.title + ", " +
				panel.autoRefreshCommand, Date.now());
		}
	}

	closeControlPanel(): void {
		if (this.noControlPanel) return;

		const user = Users.get(this.subHostName || this.hostName);
		if (user) {
			CommandParser.parse(user, user, Config.commandCharacter + CommandParser.getGameHtmlPages().gameHostControlPanel.baseCommand +
				" " + this.room.title + ", " + CLOSE_COMMAND, Date.now());
		}
	}

	isHost(user: User): boolean {
		if (user.id === this.hostId || (this.subHostId && user.id === this.subHostId)) return true;
		return false;
	}

	useHostCommand(command: string, target?: string): void {
		this.parseCommand(this.subHostName || this.hostName, command, target);
	}

	setStartTimer(minutes: number): void {
		if (this.startTimer) clearTimeout(this.startTimer);
		this.startTimer = setTimeout(() => this.useHostCommand('startgame'), minutes * 60 * 1000);
	}

	// Players
	addPlayer(user: User): Player | undefined {
		if (this.options.freejoin) {
			if (!this.joinNotices.has(user.id)) {
				this.sendFreeJoinNotice(user);
				this.joinNotices.add(user.id);
			}
			return;
		}

		if (this.started) return;

		const player = this.createPlayer(user);
		if (!player) return;

		if (!this.joinNotices.has(user.id)) {
			this.sendJoinNotice(player);
			this.joinNotices.add(user.id);
		}

		if (!this.signupsHtmlTimeout) {
			this.signupsHtmlTimeout = setTimeout(() => {
				this.sayUhtmlChange(this.signupsUhtmlName, this.getSignupsPlayersHtml());
				this.signupsHtmlTimeout = null;
			}, this.getSignupsUpdateDelay());
		}

		if (this.playerCap && this.playerCount >= this.playerCap) this.start();

		return player;
	}

	removePlayer(user: User | string, silent?: boolean): void {
		const player = this.destroyPlayer(user);
		if (!player) return;

		const id = typeof user === 'string' ? Tools.toId(user) : user.id;
		if (!silent && !this.leaveNotices.has(id)) {
			this.sendLeaveNotice(player);
			this.leaveNotices.add(id);
		}

		if (this.options.freejoin) return;

		if (!this.started) {
			if (!this.signupsHtmlTimeout) {
				this.signupsHtmlTimeout = setTimeout(() => {
					this.sayUhtmlChange(this.signupsUhtmlName, this.getSignupsPlayersHtml());
					this.signupsHtmlTimeout = null;
				}, this.getSignupsUpdateDelay());
			}
		}
	}

	splitPlayers(teams: number, teamNames?: string[]): void {
		this.teams = this.generateTeams(teams, teamNames);
		for (const i in this.teams) {
			const team = this.teams[i];
			for (const player of team.players) {
				const points = this.points.get(player);
				if (points) team.points += points;
			}
		}
	}

	unSplitPlayers(): void {
		for (const i in this.teams) {
			const team = this.teams[i];
			for (const player of team.players) {
				delete player.team;
			}
		}

		this.teams = null;
	}

	setUhtmlBaseName(): void {
		const database = Storage.getDatabase(this.room);
		if (!database.userHostedGameCounts) database.userHostedGameCounts = {};
		if (!(this.format.id in database.userHostedGameCounts)) database.userHostedGameCounts[this.format.id] = 0;
		database.userHostedGameCounts[this.format.id]++;

		this.uhtmlBaseName = "userhosted-" + this.format.id + "-" + database.userHostedGameCounts[this.format.id];
		this.signupsUhtmlName = this.uhtmlBaseName + "-signups";
		this.joinLeaveButtonUhtmlName = this.uhtmlBaseName + "-join-leave";
	}

	// Game lifecycle
	onInitialize(): boolean {
		this.setUhtmlBaseName();

		this.options = {};
		this.endTime = Date.now() + HOST_TIME_LIMIT;
		if (this.format.link) this.format.description += "<br /><br /><b><a href='" + this.format.link + "'>More info</a></b>";
		if (this.format.freejoin) {
			this.options.freejoin = 1;
			this.minPlayers = 0;
		}

		return true;
	}

	getHighlightPhrase(): string {
		return Games.getUserHostedGameHighlight() + " " + this.id;
	}

	getSignupsHtml(): string {
		return Games.getHostBoxHtml(this.room, this.hostName, this.name, this.format, this.getHighlightPhrase());
	}

	signups(): void {
		this.signupsTime = Date.now();
		this.signupsStarted = true;

		const database = Storage.getDatabase(this.room);
		if (database.gameHostBoxes && this.hostId in database.gameHostBoxes) {
			this.customBox = database.gameHostBoxes[this.hostId];
		}

		this.sayUhtml(this.uhtmlBaseName + "-description", this.getSignupsHtml());
		if (!this.options.freejoin) this.sayUhtml(this.signupsUhtmlName, this.getSignupsPlayersHtml());
		this.sayUhtml(this.joinLeaveButtonUhtmlName, "<center>" + this.getJoinButtonHtml() + "</center>");

		this.room.notifyRank("all", this.room.title + " user-hosted game", this.name, this.hostId + " " + this.getHighlightPhrase());

		this.hostTimeout = setTimeout(() => {
			this.say((this.subHostName || this.hostName) + " there are " + Tools.toDurationString(FIRST_ACTIVITY_WARNING) + " remaining " +
				"in the game!");
			this.setSecondActivityTimer();
		}, HOST_TIME_LIMIT - FIRST_ACTIVITY_WARNING);

		if (this.options.freejoin) {
			this.started = true;
			this.startTime = Date.now();
		}
	}

	start(isAuth?: boolean): boolean {
		if (this.started || (this.minPlayers && !isAuth && this.playerCount < this.minPlayers)) return false;

		if (this.startTimer) clearTimeout(this.startTimer);
		if (this.signupsHtmlTimeout) clearTimeout(this.signupsHtmlTimeout);

		this.started = true;
		this.startTime = Date.now();
		this.joinNotices.clear();
		this.leaveNotices.clear();
		this.room.notifyOffRank("all");
		this.sayUhtmlChange(this.signupsUhtmlName, this.getSignupsPlayersHtml());
		this.sayUhtmlChange(this.joinLeaveButtonUhtmlName, this.getSignupsEndMessage());

		this.say(this.name + " is starting!");
		for (const i in this.players) {
			this.players[i].sendRoomHighlight(this.name + " is starting!");
		}

		return true;
	}

	setSecondActivityTimer(): void {
		if (this.hostTimeout) clearTimeout(this.hostTimeout);
		this.hostTimeout = setTimeout(() => {
			this.say((this.subHostName || this.hostName) + " you have " + Tools.toDurationString(SECOND_ACTIVITY_WARNING) + " to " +
				"declare the winner(s) with ``" + Config.commandCharacter + "win [winner]`` or ``" +
				Config.commandCharacter + "autowin [places]``!");
			this.hostTimeout = setTimeout(() => {
				this.say((this.subHostName || this.hostName) + " your time is up!");
				this.end();
			}, SECOND_ACTIVITY_WARNING);
		}, this.endTime - Date.now() - SECOND_ACTIVITY_WARNING);
	}

	end(): void {
		if (this.ended) throw new Error("Game already ended");
		this.ended = true;
		this.updatedDatabase = true;

		const now = Date.now();
		Games.setLastUserHostTime(this.room, this.hostId, now);

		// possibly customized name attribute
		Games.setLastUserHostFormatTime(this.room, Tools.toId(this.format.name), now);

		const database = Storage.getDatabase(this.room);
		if (!this.subHostName) {
			if (!database.userHostedGameStats) database.userHostedGameStats = {};
			if (!(this.hostId in database.userHostedGameStats)) database.userHostedGameStats[this.hostId] = [];
			database.userHostedGameStats[this.hostId].push({
				endTime: now,
				format: this.format.name,
				inputTarget: this.format.inputTarget,
				startingPlayerCount: this.playerCount,
				endingPlayerCount: this.getRemainingPlayerCount(),
				startTime: this.signupsTime,
				winners: Array.from(this.winners.keys()).map(x => x.id),
			});
		}

		Games.setLastGame(this.room, now);
		Games.setLastUserHostedGame(this.room, now);
		database.lastUserHostedGameTime = now;

		if (!database.lastUserHostedGameFormatTimes) database.lastUserHostedGameFormatTimes = {};
		database.lastUserHostedGameFormatTimes[this.format.id] = now;

		if (!database.pastUserHostedGames) database.pastUserHostedGames = [];
		database.pastUserHostedGames.unshift({inputTarget: this.format.inputTarget, name: this.name, time: now});
		while (database.pastUserHostedGames.length > 8) {
			database.pastUserHostedGames.pop();
		}

		Storage.addPoints(this.room, Storage.gameHostingLeaderboard, this.subHostName || this.hostName, 1, this.format.id);

		if (Config.rankedGames && Config.rankedGames.includes(this.room.id)) {
			let hostDifficulty: GameDifficulty;
			if (Config.userHostedGameHostDifficulties && this.format.id in Config.userHostedGameHostDifficulties) {
				hostDifficulty = Config.userHostedGameHostDifficulties[this.format.id];
			} else {
				hostDifficulty = 'medium';
			}

			let hostBits = 300;
			if (hostDifficulty === 'medium') {
				hostBits = 400;
			} else if (hostDifficulty === 'hard') {
				hostBits = 500;
			}

			let hostName = this.hostName;
			if (this.subHostName) {
				hostName = this.subHostName;
				hostBits /= 2;
			}

			// eslint-disable-next-line @typescript-eslint/no-extra-parens
			if (Config.afd) hostBits *= (this.random(50) + 1);

			if (Config.onUserHostedGameHost) Config.onUserHostedGameHost(this.room, this.format, hostName);

			Storage.addPoints(this.room, Storage.gameLeaderboard, hostName, hostBits, 'userhosted');
			const user = Users.get(hostName);
			if (user) {
				user.say("You were awarded " + hostBits + " bits! To see your total amount, use this command: ``" +
					Config.commandCharacter + "bits " + this.room.title + "``. Thanks for your efforts, we hope you host again soon!");
			}
		}

		this.setCooldownAndAutoCreate('scripted');

		this.deallocate(false);
	}

	forceEnd(user: User, reason?: string): void {
		Games.removeLastUserHostTime(this.room, this.hostId);
		this.say(this.name + " " + this.activityType + " was forcibly ended!");
		this.room.modnote(this.name + " was forcibly ended by " + user.name + (reason ? " (" + reason + ")" : ""));
		this.deallocate(true);
	}

	clearHangman(): void {
		if (this.room.serverHangman) this.room.endHangman();
	}

	clearSignupsNotification(): void {
		if (!this.started || this.options.freejoin) this.room.notifyOffRank("all");
	}

	cleanupTimers(): void {
		super.cleanupTimers();

		if (this.gameTimer) {
			clearTimeout(this.gameTimer);
			// @ts-expect-error
			this.gameTimer = undefined;
		}

		if (this.hostTimeout) {
			clearTimeout(this.hostTimeout);
			// @ts-expect-error
			this.hostTimeout = undefined;
		}
	}

	deallocate(forceEnd: boolean): void {
		if (!this.ended) this.ended = true;

		this.reset();
		this.cleanupMessageListeners();
		this.cleanupMisc();

		if (this.room.userHostedGame === this) {
			// @ts-expect-error
			this.room.userHostedGame = undefined;
		}

		this.closeControlPanel();

		if (forceEnd && Config.gameAutoCreateTimers && this.room.id in Config.gameAutoCreateTimers) {
			Games.setAutoCreateTimer(this.room, 'userhosted', FORCE_END_CREATE_TIMER);
		}

		this.destroyTeams();
		this.destroyPlayers();

		if (this.updatedDatabase) Storage.tryExportDatabase(this.room.id);

		Tools.unrefProperties(this, ["ended", "id", "name"]);
	}
}

export const game: IUserHostedFile = {
	class: UserHostedGame,
	formats: [
		{
			name: "Floette's Forum Game",
			description: "A game from Game Corner's official forum.",
			aliases: ['ffg'],
			customizableAttributes: ['name', 'link'],
		},
		{
			name: "Acrotopia",
			description: "Each round, players earn points by coming up with creative interpretations of an acronym chosen by the host",
			freejoin: true,
		},
		{
			name: "Battle Maison",
			aliases: ['bm'],
			description: "A tournament style game where each player is given a Pokemon to battle with in [Gen " + Dex.getGen() + "] OU. " +
				"Defeating an opponent allows the player to add the opponent's Pokemon to his or her team. This continues until there " +
				"is only one player left standing!",
		},
		{
			name: "Bewear's Birthday Cakes",
			mascot: "Bewear",
			aliases: ['BBC', 'Bewears'],
			description: "Each round, players will PM the host a cake color and a plate. A random Pokemon will be shown, and players " +
				"gain points if the cake color matches the Pokemon's color, if the plate's type matches the Pokemon, or if the plate's " +
				"type receives super effective damage from the Pokemon's types. However, choosing a plate type that deals super " +
				"effective damage to the Pokemon will cause the player to lose a point! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/bewear-s-birthday-cakes-t744.html'>More info</a>",
		},
		{
			name: "Commonyms",
			description: "Players must find the word that applies to all of the words in the puzzle Ex: sky, jay, sad | Answer: blue",
			freejoin: true,
		},
		{
			name: "Diglett's Whack-a-Mole",
			mascot: "Diglett",
			aliases: ['DWM', 'Digletts', 'Whack a Diglett', 'WAD'],
			description: "Players predict locations where Diglett are hiding to bop them on their heads and earn a point! If you're " +
				"lucky, you may encounter a Dugtrio, which is worth three points! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/whack-a-diglett-t813.html'>More info</a>",
			freejoin: true,
		},
		{
			name: "Dugtrio's Dex Entries",
			mascot: "Dugtrio",
			aliases: ['DDE'],
			description: "Each round, players create a brand new Pokedex entry for each Pokemon the host presents. Entries are judged by " +
				"creativity and originality.",
			freejoin: true,
		},
		{
			name: "Exeggutor-Alola's Limbo",
			mascot: "Exeggutor-Alola",
			aliases: ['Alola Limbo', 'EAL', 'Exeggutors'],
			description: "A height is chosen at the start of the game, and each round, players PM the host with a Pokemon selected with " +
				"!randpoke. If a player's Pokemon is taller than the allowed height, they are eliminated! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/alola-limbo-t747.html'>More info</a>",
		},
		{
			name: "Gameathlon",
			description: "A series of Game Corner games in one! Players try to win each mini-game to earn points.",
			freejoin: true,
		},
		{
			name: "Ghost",
			description: "Each player adds a letter to a string of letters while trying not to form an English word on their turn. If a " +
				"word is formed, that player is eliminated. Players may challenge the previous player for elimination if there is no " +
				"word that can be formed from the existing string.",
		},
		{
			name: "Guess That Auth",
			description: "Players guess users that have matching global and room auth as the lists presented by the host.",
			aliases: ['gta'],
			freejoin: true,
		},
		{
			name: "Hall of Games",
			aliases: ['HOG'],
			description: "Players guess commands that are used in the given games! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/hall-of-games-t800.html'>More info</a>",
			freejoin: true,
		},
		{
			name: "Hunger Games",
			description: "This is a game of storytelling, decision-making, swift responses, and chance! The host will create a scenario " +
				"in which players have to choose their paths and overcome obstacles to be the last one standing.",
			aliases: ['hg'],
			approvedHostOnly: true,
		},
		{
			name: "Jynx's Klutzy Kissing",
			mascot: "Jynx",
			aliases: ['JKK'],
			description: "Kiss the Pokemon with gender differences to win! Use the command <code>" + Config.commandCharacter + "kiss" +
				"</code> on the Pokemon you believe has different sprites when it is female or male.",
			freejoin: true,
		},
		{
			name: "Kecleon's Swap Shop",
			mascot: "Kecleon",
			aliases: ['KSS', 'Kecleons'],
			description: "The host will display a random Pokemon, which players will either claim for themselves or give to another " +
				"player. The players will battle using their assigned Pokemon in a tournament style game, where winners of " +
				"battles take their opponent's Pokemon. This continues until there is only one player left standing! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/kecleon-39-s-swap-shop-t749.html'>More info</a>",
		},
		{
			name: "Lapras' Mystery Locations",
			mascot: "Lapras",
			aliases: ['LML', 'Lapras'],
			description: "Players guess locations based on the given hints (one guess per hint)! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/lapras-s-mystery-locations-t1132.html'>More info</a>",
			freejoin: true,
		},
		{
			name: "Letter Getter",
			description: "In this game, players must complete the phrase with the given letters and (optional) numbers. Example: <i>26 L " +
				"of the A</i> would be <i>26 Letters of the Alphabet</i>.",
			freejoin: true,
		},
		{
			name: "Luig-E's Challenge",
			aliases: ['Luiges'],
			description: "Each round, the players decide to either attack, counter or rest to take down Luig-E. However, Luig-E picks a " +
				"move and can attack too, so be careful with your picks!",
		},
		{
			name: "Lyrics",
			description: "Players have to guess the names and singers of songs based on lyrics presented by the host.",
			freejoin: true,
		},
		{
			name: "Mad Gabs",
			description: "The host gives the pronunciation of a word and players have to correctly identify the word to score points.",
			freejoin: true,
		},
		{
			name: "Mareep's Counting Sheep",
			mascot: "Mareep",
			aliases: ['mareeps', 'counting'],
			description: "Players have to do " + Config.commandCharacter + "count in the right order based on the given category " +
				"(numbers, words or etc.). The first person to mess up the sequence loses a point, so be careful!",
		},
		{
			name: "Mascots",
			description: "Each round, the host will provide a song and players must find a Pokemon that best represents it using the " +
				"standard formatting --[Pokemon]--.",
			freejoin: true,
		},
		{
			name: "Mega Mania",
			description: "Each round, players make mega evolutions for a Pokemon given by the host. Entries are judged on creativity " +
				"and viability made through typing, stats, and abilities.",
			freejoin: true,
		},
		{
			name: "Meloetta's Melodies",
			mascot: "Meloetta",
			aliases: ['Meloettas'],
			description: "Players guess themes from Pokemon games based on a given audio clip! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/meloetta-39-s-melodies-t785.html'>More info</a>",
			freejoin: true,
		},
		{
			name: "Metagross' Mind Mash",
			mascot: "Metagross",
			aliases: ['mmm', 'metagrosssmindmash'],
			description: "Players answer riddles within the time limit to survive each round!",
			freejoin: true,
		},
		{
			name: "Mimics",
			description: "Be the 2nd player to say the host's phrase exactly! Use deception to trick competitors into saying the " +
				"host's phrase to earn points. Formatting does not count unless stated otherwise by the host.",
			freejoin: true,
		},
		{
			name: "Necturna's Move Tutor",
			aliases: ['NMT', 'Necturnas'],
			description: "Each round, players create a move of a type chosen by the host. Entries are judged on creativity and " +
				"viability based on base power, PP, and secondary effects.",
			freejoin: true,
		},
		{
			name: "Nickgames",
			description: "Each round, the host will announce a Pokemon and players must create the most funny, clever, cute, creative, " +
				"or fitting nickname for it using the standard formatting --[nickname]--.",
			freejoin: true,
		},
		{
			name: "Pachirisu's Picking Process",
			mascot: 'Pachirisu',
			aliases: ['pachirisus'],
			description: "A random Pokemon is displayed by the host and the players have to either recommend or not recommend it. " +
				"Then, the host will display another random Pokemon. If the 1st Pokemon wins type-wise, the players that recommended " +
				"it win a point and vice-versa!",
			freejoin: true,
		},
		{
			name: "Passimian's Mystery Abilities",
			mascot: "Passimian",
			aliases: ['PMA', 'Passimians'],
			description: "Players guess abilities based on the given hints (one guess per hint)! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/passimian-s-mystery-abilities-t1139.html'>More info</a>",
			freejoin: true,
		},
		{
			name: "Pikachu-Cosplay's Contest Spectacular",
			mascot: "Pikachu-Cosplay",
			aliases: ['PCS', 'PCCS'],
			description: "Players will be given 6 random Pokemon in PMs. The host will choose a category, and each player will PM " +
				"the host the Pokemon they think best fits the category. The player(s) with the most votes will earn points! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/pikachu-s-contest-spectacular-t382.html'>More info</a>",
		},
		{
			name: "Play Your Cards Right",
			aliases: ['PYCR'],
			description: "Each round, a random Pokemon and a numerical statistic of a Pokemon is selected. Players try to predict " +
				"if the next Pokemon will have a statistic that is higher or lower than the previous Pokemon. " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/play-your-cards-right-t823.html'>More info</a>",
		},
		{
			name: "Precise Timing",
			aliases: ['pt'],
			description: "Each round, the host will set a timer and players must do <code>/me check</code> before time runs out. The " +
				"catch: the first one to check in is eliminated.",
		},
		{
			name: "Private Objects",
			description: "Each round, the host selects a topic, and players have to PM the host with an answer. The host selects a " +
				"response and players will have to identify the respondent to gain points. If no one manages to correctly identify " +
				"the player, that player will instead get the point.",
			aliases: ['po'],
		},
		{
			name: "Probopass' Letter Station",
			mascot: "Probopass",
			description: "A letter is picked and players have to name something that starts with that letter that also matches the " +
				"given parameters!",
			aliases: ['PLS'],
			freejoin: true,
		},
		{
			name: "Pun Game",
			description: "Players make creative puns referencing the Pokemon selected by the host to score points.",
			freejoin: true,
		},
		{
			name: "Pupitar's Power Placement",
			mascot: "Pupitar",
			aliases: ['Pupitars'],
			description: "Players guess moves with a base power that shares the same tens range as the randomly chosen number! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/pupitar-39-s-power-placement-t723.html'>More info</a>",
			freejoin: true,
		},
		{
			name: "Purugly's Purfect Params",
			mascot: "Purugly",
			aliases: ['Puruglys'],
			description: "Players search for a parameter that when entered into <code>/nds</code> with a given parameter, " +
				"results in a specific amount of Pokemon! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/purugly-s-purfect-params-t1003.html'>More info</a>",
			freejoin: true,
		},
		{
			name: "Ralts' Ability Race",
			mascot: "Ralts",
			aliases: ['RAR', 'Ralts'],
			description: "Players guess one to three Pokemon from different evolutionary lines, each one sharing a different ability " +
				"with the given Pokemon! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/ralts-ability-race-t1126.html'>More info</a>",
			freejoin: true,
		},
		{
			name: "Rapid CAP",
			description: "Each round, players will create Pokemon based on the typing given by the host, including the species, name, " +
				"and ability(ies) in their answers. Dex entries are not required, but may give a player an edge over the rest of the " +
				"competition.",
			freejoin: true,
		},
		{
			name: "Rock Paras Scizor",
			aliases: ["RPS"],
			description: "A Pokemon themed rock paper scissors tournament where typings determine the winner. PM a Pokemon to the host " +
				"in hopes of having a type advantage over your opponent. More info: " +
				"https://docs.google.com/document/d/1H6bRZlxJSfNZvqzxnbTyV2RiXABtuVgZdprTNEfn6bk",
		},
		{
			name: "Rotom's Dex Trivia",
			mascot: "Rotom",
			description: "A dex entry of a Pokemon will be posted and players have to be first to guess the Pokemon correctly!",
			aliases: ['RDT', 'rotomdexstrivia', 'dextrivia'],
			freejoin: true,
		},
		{
			name: "Scizor's Clock Tower",
			mascot: "Scizor",
			aliases: ['Clock Tower', 'Scizors'],
			description: "Evade the Scizor as it tries to capture the players by selecting their doors and capturing its prey by being " +
				"faster than them in a series of minigames! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/scizor-39-s-clock-tower-t803.html'>More info</a>",
		},
		{
			name: "Scyther's Message Slide",
			mascot: "Scyther",
			description: "Players have to PM the host. Depending on the order in which they PMed, they can win or lose points!",
			aliases: ['SMS'],
			freejoin: true,
		},
		{
			name: "Similarities",
			description: "Each round, the host names three objects (Pokemon related or not) and players must guess what the similarity " +
				"between the three is.",
			freejoin: true,
		},
		{
			name: "Simon Says",
			description: "Each round, the host will announce an action. If the action is preceded by 'Simon Says', players must do the " +
				"action using <code>/me [action]</code>. If players do the action when it is not preceded by 'Simon Says', they are " +
				"eliminated.",
		},
		{
			name: "Sinistea's Synonyms",
			mascot: "Sinistea",
			aliases: ['Sinisteas'],
			description: "Players guess something Pokemon related that the given synonym is referring to! " +
				"<a href='https://www.tapatalk.com/groups/ps_game_corner/sinistea-s-synonyms-t1154.html'>More info</a>",
			freejoin: true,
		},
		{
			name: "Spot The Reference",
			description: "Players must identify the source (who said it, movie/tv show title, etc.) of a quote",
			aliases: ['str'],
			freejoin: true,
		},
		{
			name: "Spyfall",
			description: "Each player is sent the location for the game and a unique job. If a player is chosen to be the spy, only they " +
				"will know and they will not receive the location. By asking questions in turns, the spy tries to guess the location and " +
				"the other players try to discover the spy.",
		},
		{
			name: "The Chosen One",
			description: "The host PMs a selected player three words. A timer is set and all players have a conversation in the chat, in " +
				"which the selected player must use all three words. After the timer ends, all players PM the host who they think was " +
				"The Chosen One.",
			aliases: ['tco', 'chosenone'],
		},
		{
			name: "The Evo Game",
			description: "Each round, the host will announce a Pokemon and players must create an evolution, providing the species, " +
				"typing, ability(ies), and dex entry.",
			aliases: ['evogame'],
			freejoin: true,
		},
		{
			name: "The Missing Link",
			description: "Players must find the missing word that completes both phrases! Example: Key _ Reaction (Chain)",
			aliases: ['missinglink', 'tml'],
			freejoin: true,
		},
		{
			name: "Two Truths and a Lie",
			description: "Each round, the host presents the players with three statements. Players have to correctly identify the lie " +
				"to score points.",
			aliases: ['ttal', 'ttaal'],
			freejoin: true,
		},
		{
			name: "Voltorb's Tricks",
			mascot: "Voltorb",
			description: "Players try to win each mini-game to get a chance of catching opponents with a randomly chosen Poke Ball. " +
				"Each Poke Ball has a different catch rate, and getting a Voltorb (or Electrode) may result in your own elimination!",
			aliases: ['voltorbs', 'vt'],
		},
		{
			name: "Weavile's Wicked Battlegrounds",
			mascot: "Weavile",
			description: "Each round, one player PMs the host a move while the other players PM the host a Pokemon. If a player's " +
				"Pokemon resists the move or is immune to it, they win points. However, the more picked Pokemon the move hits super " +
				"effectively, the more points the user gets.",
			aliases: ['WWB'],
		},
		{
			name: "20 Questions",
			description: "The host will choose either a Pokemon or real world object and players take turns asking yes/no questions to " +
				"figure out what it is. The game ends if no one guesses correctly after 20 questions!",
			aliases: ['20q', '20qs'],
		},
	],
};
