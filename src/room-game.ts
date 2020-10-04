import type { PRNGSeed } from "./prng";
import { PRNG } from "./prng";
import type { Player } from "./room-activity";
import { Activity, PlayerTeam } from "./room-activity";
import type { Room } from "./rooms";
import type { IPokemon, IPokemonCopy } from "./types/dex";
import type { IGameFormat, IPokemonUhtml, ITrainerUhtml, IUserHostedFormat, PlayerList } from "./types/games";
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
	minPlayers: number = 4;
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
			let html = "<div class='infobox'>";
			if (this.lastPokemonUhtml.type === 'gif') {
				html += "<center>(gif" + (this.lastPokemonUhtml.pokemon.length > 1 ? "s" : "") + ": " +
					this.lastPokemonUhtml.pokemon.join(", ") + ")</center>";
			} else {
				html += "(icon" + (this.lastPokemonUhtml.pokemon.length > 1 ? "s" : "") + ": " +
					this.lastPokemonUhtml.pokemon.join(", ") + ")";
			}

			html += '<div style="float:right;color:#888;font-size:8pt">[' + this.lastPokemonUhtml.user + ']</div>' +
				'<div style="clear:both"></div>';

			html += "</div>";

			this.sayUhtmlChange(this.lastPokemonUhtml.uhtmlName, html);
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
			let html = "<div class='infobox'><center>(trainer" + (this.lastTrainerUhtml.trainerList.length > 1 ? "s" : "") + ": " +
				this.lastTrainerUhtml.trainerList.join(", ") + ")</center>";

			html += '<div style="float:right;color:#888;font-size:8pt">[' + this.lastTrainerUhtml.user + ']</div>' +
				'<div style="clear:both"></div>';

			html += "</div>";

			this.sayUhtmlChange(this.lastTrainerUhtml.uhtmlName, html);
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
}
