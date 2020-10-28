import type { PRNGSeed } from "./prng";
import { PRNG } from "./prng";
import type { Player } from "./room-activity";
import { Activity, PlayerTeam } from "./room-activity";
import type { Room } from "./rooms";
import type { IGameFormat, IPokemonUhtml, ITrainerUhtml, IUserHostedFormat, PlayerList } from "./types/games";
import type { IPokemon, IPokemonCopy } from "./types/pokemon-showdown";
import type { User } from "./users";

const teamNameLists: Dict<string[][]> = {
	'2': [["Red", "Blue"], ["Gold", "Silver"], ["Ruby", "Sapphire"], ["Diamond", "Pearl"], ["Black", "White"], ["X", "Y"], ["Sun", "Moon"],
		["Sword", "Shield"], ["Land", "Sea"], ["Time", "Space"], ["Yin", "Yang"], ["Life", "Destruction"], ["Sunne", "Moone"]],
	'3': [["Red", "Blue", "Yellow"], ["Gold", "Silver", "Crystal"], ["Ruby", "Sapphire", "Emerald"], ["Diamond", "Pearl", "Platinum"],
		["Land", "Sea", "Sky"], ["Time", "Space", "Antimatter"], ["Yin", "Yang", "Wuji"], ["Life", "Destruction", "Order"],
		["Sunne", "Moone", "Prism"]],
	'4': [["Red", "Blue", "Yellow", "Green"], ["Fall", "Winter", "Spring", "Summer"], ["Water", "Fire", "Earth", "Air"],
		["Clubs", "Spades", "Hearts", "Diamonds"]],
};

export abstract class Game extends Activity {
	readonly activityType: string = 'game';
	largestTeam: PlayerTeam | null = null;
	minPlayers: number = 4;
	playerOrders: Dict<Player[]> | null = null;
	readonly round: number = 0;
	signupsStarted: boolean = false;
	signupsTime: number = 0;
	teams: Dict<PlayerTeam> | null = null;
	readonly winners = new Map<Player, number>();

	prng: PRNG;
	initialSeed: PRNGSeed;

	// set in initialize()
	description!: string;
	signupsUhtmlName!: string;
	joinLeaveButtonUhtmlName!: string;

	lastPokemonUhtml?: IPokemonUhtml;
	lastTrainerUhtml?: ITrainerUhtml;
	mascot?: IPokemonCopy;
	maxPlayers?: number;
	playerCap?: number;
	readonly points?: Map<Player, number>;
	startingPoints?: number;

	constructor(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed) {
		super(room, pmRoom);

		this.prng = new PRNG(initialSeed);
		this.initialSeed = this.prng.initialSeed.slice() as PRNGSeed;
	}

	abstract getMascotAndNameHtml(additionalText?: string): string;
	abstract onInitialize(format: IGameFormat | IUserHostedFormat): void;

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

	rollForShinyPokemon(extraChance?: number): boolean {
		let chance = 150;
		if (extraChance) chance -= extraChance;
		return !this.random(chance);
	}

	initialize(format: IGameFormat | IUserHostedFormat): void {
		this.name = format.nameWithOptions || format.name;
		this.id = format.id;
		this.description = format.description;
		if (this.maxPlayers) this.playerCap = this.maxPlayers;

		this.onInitialize(format);
	}

	announceWinners(): void {
		const len = this.winners.size;
		if (len) {
			this.say("**Winner" + (len > 1 ? "s" : "") + "**: " + this.getPlayerNames(this.winners));
		} else {
			this.say("No winners this game!");
		}
	}

	setCooldownAndAutoCreate(nextGameType: 'scripted' | 'userhosted'): void {
		if (this.isPm(this.room)) return;

		if (Config.gameCooldownTimers && this.room.id in Config.gameCooldownTimers) {
			this.say("The **" + Config.gameCooldownTimers[this.room.id] + "-minute cooldown** until the next game starts now!");
			const minigameCooldownMinutes = Config.gameCooldownTimers[this.room.id] / 2;
			if (minigameCooldownMinutes >= 1) Games.setGameCooldownMessageTimer(this.room, minigameCooldownMinutes);
		}

		if (Config.gameAutoCreateTimers && this.room.id in Config.gameAutoCreateTimers) {
			let autoCreateTimer = Config.gameAutoCreateTimers[this.room.id];
			if (Config.gameCooldownTimers && this.room.id in Config.gameCooldownTimers) {
				autoCreateTimer += Config.gameCooldownTimers[this.room.id];
			}
			Games.setAutoCreateTimer(this.room, nextGameType, autoCreateTimer * 60 * 1000);
		}
	}

	getDescription(): string {
		return this.description;
	}

	getSignupsHtmlUpdate(): string {
		return "<div class='infobox'>" + this.getMascotAndNameHtml(" - signups (join with " + Config.commandCharacter + "joingame!)") +
			"<br /><br /><b>Players (" + this.playerCount + ")</b>: " + this.getPlayerNames() + "</div>";
	}

	setUhtmlBaseName(gameType: 'scripted' | 'userhosted'): void {
		let gameCount: number;
		if (this.isPm(this.room)) {
			gameCount = this.random(1000);
		} else {
			const database = Storage.getDatabase(this.room);
			if (gameType === 'scripted') {
				if (!database.gameCount) database.gameCount = 0;
				database.gameCount++;
				gameCount = database.gameCount;
			} else {
				if (!database.userHostedGameCount) database.userHostedGameCount = 0;
				database.userHostedGameCount++;
				gameCount = database.userHostedGameCount;
			}
		}
		this.uhtmlBaseName = gameType + '-' + gameCount + '-' + this.id;
		this.signupsUhtmlName = this.uhtmlBaseName + "-signups";
		this.joinLeaveButtonUhtmlName = this.uhtmlBaseName + "-join-leave";
	}

	sayPokemonUhtml(pokemon: IPokemon[], type: 'gif' | 'icon', uhtmlName: string, html: string, user: User): void {
		if (this.lastPokemonUhtml) {
			let lastHtml = "<div class='infobox'>";
			if (this.lastPokemonUhtml.type === 'gif') {
				lastHtml += "<center>(gif" + (this.lastPokemonUhtml.pokemon.length > 1 ? "s" : "") + ": " +
					this.lastPokemonUhtml.pokemon.join(", ") + ")</center>";
			} else {
				lastHtml += "(icon" + (this.lastPokemonUhtml.pokemon.length > 1 ? "s" : "") + ": " +
					this.lastPokemonUhtml.pokemon.join(", ") + ")";
			}

			lastHtml += '<div style="float:right;color:#888;font-size:8pt">[' + this.lastPokemonUhtml.user + ']</div>' +
				'<div style="clear:both"></div>';

			lastHtml += "</div>";

			this.sayUhtmlChange(this.lastPokemonUhtml.uhtmlName, lastHtml);
		}

		this.sayUhtmlAuto(uhtmlName, html);
		this.lastPokemonUhtml = {
			pokemon: pokemon.map(x => x.name),
			type,
			uhtmlName,
			user: user.name,
		};
	}

	sayTrainerUhtml(trainerList: string[], uhtmlName: string, html: string, user: User): void {
		if (this.lastTrainerUhtml) {
			let lastHtml = "<div class='infobox'><center>(trainer" + (this.lastTrainerUhtml.trainerList.length > 1 ? "s" : "") + ": " +
				this.lastTrainerUhtml.trainerList.join(", ") + ")</center>";

			lastHtml += '<div style="float:right;color:#888;font-size:8pt">[' + this.lastTrainerUhtml.user + ']</div>' +
				'<div style="clear:both"></div>';

			lastHtml += "</div>";

			this.sayUhtmlChange(this.lastTrainerUhtml.uhtmlName, lastHtml);
		}

		this.sayUhtmlAuto(uhtmlName, html);
		this.lastTrainerUhtml = {
			trainerList,
			uhtmlName,
			user: user.name,
		};
	}

	addPoints(player: Player, awardedPoints: number): number {
		if (!this.points) throw new Error(this.name + " called addPoints with no points Map");

		let points = this.points.get(player) || 0;
		points += awardedPoints;
		if (points) {
			this.points.set(player, points);
		} else {
			this.points.delete(player);
		}

		if (player.team) player.team.points += awardedPoints;

		return points;
	}

	shufflePlayers(players?: PlayerList): Player[] {
		return this.shuffle(this.getPlayerList(players));
	}

	getRandomPlayer(players?: PlayerList): Player {
		return this.players[this.sampleOne(Object.keys(this.getRemainingPlayers(players)))];
	}

	generateTeams(numberOfTeams: number, teamNames?: string[]): Dict<PlayerTeam> {
		const teams: Dict<PlayerTeam> = {};
		const playerList = this.shufflePlayers();
		if (!teamNames) teamNames = this.sampleOne(teamNameLists['' + numberOfTeams]);
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

	changePlayerTeam(player: Player, newTeam: PlayerTeam): void {
		let points: number | undefined;
		if (player.team) {
			const oldTeam = player.team;
			oldTeam.players.splice(oldTeam.players.indexOf(player), 1);

			if (this.points) {
				points = this.points.get(player);
				if (points) oldTeam.points -= points;
			}
		}

		player.team = newTeam;
		newTeam.players.push(player);
		if (points) newTeam.points += points;
	}

	setLargestTeam(): void {
		if (!this.teams) throw new Error("setLargestTeam() called without teams");
		const teamIds = Object.keys(this.teams);
		this.largestTeam = this.teams[teamIds[0]];

		for (let i = 1; i < teamIds.length; i++) {
			const team = this.teams[teamIds[i]];
			if (team.players.length > this.largestTeam.players.length) this.largestTeam = team;
		}
	}

	setTeamPlayerOrders(): void {
		if (!this.teams) throw new Error("setTeamPlayerOrders() called without teams");

		for (const i in this.teams) {
			this.setTeamPlayerOrder(this.teams[i]);
		}
	}

	setTeamPlayerOrder(team: PlayerTeam): void {
		if (!this.playerOrders) throw new Error("setTeamPlayerOrder() called without playerOrders");

		this.playerOrders[team.id] = [];
		for (const player of team.players) {
			if (!player.eliminated) this.playerOrders[team.id].push(player);
		}

		this.playerOrders[team.id] = this.shuffle(this.playerOrders[team.id]);
	}

	getEmptyTeams(): PlayerTeam[] {
		if (!this.teams) throw new Error("getEmptyTeams() called without teams");
		const emptyTeams: PlayerTeam[] = [];
		const teamIds = Object.keys(this.teams);
		for (const id of teamIds) {
			if (!this.getRemainingPlayerCount(this.teams[id].players)) {
				emptyTeams.push(this.teams[id]);
			}
		}

		return emptyTeams;
	}

	getFinalTeam(): PlayerTeam | undefined {
		if (!this.teams) throw new Error("getFinalTeam() called without teams");
		const remainingTeams: PlayerTeam[] = [];
		for (const team in this.teams) {
			if (this.getRemainingPlayerCount(this.teams[team].players)) {
				remainingTeams.push(this.teams[team]);
			}
		}

		return remainingTeams.length === 1 ? remainingTeams[0] : undefined;
	}

	getPlayersDisplay(): string {
		const remainingPlayers = this.getRemainingPlayerCount();
		if (!remainingPlayers) return "**Players**: none";

		if (this.teams) {
			const teamDisplays: string[] = [];
			for (const i in this.teams) {
				const team = this.teams[i];
				teamDisplays.push(team.name + (team.points ? " (" + team.points + ")" : "") + ": " +
					team.players.filter(x => !x.eliminated).map(x => x.name).join(", "));
			}

			return "**Teams** | " + teamDisplays.join(" | ");
		}

		return "**Players (" + remainingPlayers + ")**: " + (this.points ? this.getPlayerPoints() : this.getPlayerNames());
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

	getTeamPlayers(players?: PlayerList): Dict<string[]> {
		if (!this.teams) throw new Error("getTeamPlayers() called without teams");

		players = this.getPlayerList(players);
		const teamPlayers: Dict<string[]> = {};
		for (const i in this.teams) {
			const team = this.teams[i];
			teamPlayers[team.id] = [];
			for (const player of team.players) {
				if (players.includes(player)) teamPlayers[team.id].push(player.name);
			}
		}

		return teamPlayers;
	}

	getTeamPlayerNames(players?: PlayerList): string {
		if (!this.teams) throw new Error("getTeamPlayers() called without teams");

		const teamPlayers = this.getTeamPlayers(players);
		const output: string[] = [];
		const teamKeys = Object.keys(this.teams).sort();
		for (const key of teamKeys) {
			output.push("<b>" + this.teams[key].name + "</b>: " + Tools.joinList(teamPlayers[key]));
		}
		return output.join(" | ");
	}
}
