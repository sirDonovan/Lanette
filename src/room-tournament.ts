import type { Player } from "./room-activity";
import { Activity } from "./room-activity";
import type { Room } from "./rooms";
import type { IBattleGameData } from "./types/games";
import type { IFormat } from "./types/pokemon-showdown";
import type { ICurrentTournamentBattle, ITournamentEndJson, ITournamentUpdateJson } from "./types/tournaments";

const GENERATORS: Dict<number> = {
	"Single": 1,
	"Double": 2,
	"Triple": 3,
	"Quadruple": 4,
	"Quintuple": 5,
	"Sextuple": 6,
};

export class Tournament extends Activity {
	readonly activityType: string = 'tournament';
	adjustCapTimer: NodeJS.Timer | null = null;
	readonly battleData = new Map<Room, IBattleGameData>();
	readonly battleRooms: string[] = [];
	readonly createTime: number = Date.now();
	readonly currentBattles: ICurrentTournamentBattle[] = [];
	generator: number = 1;
	readonly info: ITournamentUpdateJson & ITournamentEndJson = {
		bracketData: {type: ''},
		challengeBys: [],
		challenged: '',
		challenges: [],
		challenging: '',
		format: '',
		generator: '',
		isJoined: false,
		isStarted: false,
		playerCap: 0,
		results: [],
		teambuilderFormat: '',
	};
	isRoundRobin: boolean = false;
	isSingleElimination: boolean = false;
	manuallyNamed: boolean = false;
	manuallyEnabledPoints: boolean | undefined = undefined;
	originalFormat: string = '';
	playerLosses = new Map<Player, number>();
	scheduled: boolean = false;
	totalPlayers: number = 0;
	updates: Partial<ITournamentUpdateJson> = {};

	readonly joinBattles: boolean;

	// set in initialize()
	format!: IFormat;
	playerCap!: number;
	readonly room!: Room;

	constructor(room: Room, pmRoom?: Room) {
		super(room, pmRoom);

		this.joinBattles = Config.trackTournamentBattleScores && Config.trackTournamentBattleScores.includes(room.id) ? true : false;
	}

	initialize(format: IFormat, generator: string, playerCap: number, name?: string): void {
		this.format = format;
		this.playerCap = playerCap;
		this.name = name || format.name;
		this.originalFormat = format.name;
		this.id = format.id;
		this.uhtmlBaseName = 'tournament-' + this.id;

		this.setGenerator(generator);
	}

	setGenerator(generator: string): void {
		const generatorName = generator.split(" ")[0];
		if (generatorName in GENERATORS) {
			this.generator = GENERATORS[generatorName];
		} else {
			const generatorNumber = parseInt(generator.split("-tuple")[0]);
			if (!isNaN(generatorNumber)) this.generator = generatorNumber;
		}

		this.isRoundRobin = Tools.toId(generator).includes('roundrobin');
		this.isSingleElimination = !this.isRoundRobin && this.generator === 1;
	}

	setCustomFormatName(): void {
		const previousName = this.name;
		this.name = Dex.getCustomFormatName(this.format);
		if (this.name !== previousName) this.sayCommand("/tour name " + this.name);
	}

	canAwardPoints(): boolean {
		if (Config.manualRankedTournaments && Config.manualRankedTournaments.includes(this.room.id) && !this.manuallyEnabledPoints) {
			return false;
		}

		if (this.format.customRules) {
			if (!Config.rankedCustomTournaments || !Config.rankedCustomTournaments.includes(this.room.id)) return false;
		} else {
			if (!Config.rankedTournaments || !Config.rankedTournaments.includes(this.room.id)) return false;
		}

		if (this.format.unranked && Config.useDefaultUnrankedTournaments && Config.useDefaultUnrankedTournaments.includes(this.room.id)) {
			return false;
		}

		if (Config.unrankedTournamentFormats && this.room.id in Config.unrankedTournamentFormats &&
			Config.unrankedTournamentFormats[this.room.id].includes(this.format.id)) {
			return false;
		}

		return true;
	}

	adjustCap(cap?: number): void {
		if (!cap) {
			if (this.playerCount % 8 === 0) {
				this.sayCommand("/tour start");
				return;
			}

			let newCap = this.playerCount + 1;
			while (newCap % 8 !== 0) {
				newCap += 1;
			}

			if (this.playerCap && newCap >= this.playerCap) return;
			cap = newCap;
		}

		if (this.adjustCapTimer) clearTimeout(this.adjustCapTimer);

		this.sayCommand("/tour cap " + cap);
		if (!this.playerCap) this.sayCommand("/tour autostart on");
		this.say("The tournament's player cap is now **" + cap + "**.");
	}

	deallocate(): void {
		if (this.adjustCapTimer) clearTimeout(this.adjustCapTimer);
		if (this.startTimer) clearTimeout(this.startTimer);
		delete this.room.tournament;
	}

	start(): void {
		if (this.startTimer) clearTimeout(this.startTimer);
		this.started = true;
		this.startTime = Date.now();
	}

	onEnd(): void {
		const now = Date.now();
		const database = Storage.getDatabase(this.room);
		if (!database.pastTournaments) database.pastTournaments = [];
		database.pastTournaments.unshift({inputTarget: this.format.inputTarget, name: this.format.name, time: now});
		while (database.pastTournaments.length > 8) {
			database.pastTournaments.pop();
		}

		database.lastTournamentTime = now;
		if (!database.lastTournamentFormatTimes) database.lastTournamentFormatTimes = {};
		database.lastTournamentFormatTimes[this.format.id] = now;

		let winners: string[] = [];
		let runnersUp: string[] = [];
		let semiFinalists: string[] = [];
		if (this.info.bracketData.type === 'tree') {
			if (this.info.bracketData.rootNode) {
				const places = Tournaments.getPlacesFromTree(Tournaments.clientToEliminationNode(this.info.bracketData.rootNode));
				if (places.winner) winners = [places.winner];
				if (places.runnerup) runnersUp = [places.runnerup];
				if (places.semifinalists) semiFinalists = places.semifinalists;
			}
		} else {
			if (this.info.results[0]) winners = this.info.results[0];
			if (this.info.results[1]) runnersUp = this.info.results[1];
			if (this.info.results[2]) semiFinalists = this.info.results[2];
		}

		if (!winners.length || !runnersUp.length || (this.isSingleElimination && semiFinalists.length < 2)) return;

		if ((!this.canAwardPoints() && !this.manuallyEnabledPoints) || this.manuallyEnabledPoints === false) {
			if (!Config.displayUnrankedTournamentResults || !Config.displayUnrankedTournamentResults.includes(this.room.id)) return;

			const text = ["runner" + (runnersUp.length > 1 ? "s" : "") + "-up " + Tools.joinList(runnersUp, '**'),
				"winner" + (winners.length > 1 ? "s" : "") + " " + Tools.joinList(winners, '**')];
			if (semiFinalists.length) {
				text.unshift("semi-finalist" + (semiFinalists.length > 1 ? "s" : "") + " " + Tools.joinList(semiFinalists, '**'));
			}
			this.sayCommand('/wall Congratulations to ' + Tools.joinList(text));
		} else {
			const multiplier = Tournaments.getCombinedPointMultiplier(this.format, this.totalPlayers, this.scheduled);
			const semiFinalistPoints = Tournaments.getSemiFinalistPoints(multiplier);
			const runnerUpPoints = Tournaments.getRunnerUpPoints(multiplier);
			const winnerPoints = Tournaments.getWinnerPoints(multiplier);

			const semiFinalistPm = 'You were awarded **' + semiFinalistPoints + ' point' + (semiFinalistPoints > 1 ? "s" : "") +
				'** for being ' + (semiFinalists.length > 1 ? 'a' : 'the') + ' semi-finalist in the tournament! To see your total ' +
				'amount, use this command: ``' + Config.commandCharacter + 'rank ' + this.room.title + '``.';
			for (const semiFinalist of semiFinalists) {
				Storage.addPoints(this.room, Storage.tournamentLeaderboard, semiFinalist, semiFinalistPoints, this.format.id);
				const user = Users.get(semiFinalist);
				if (user) user.say(semiFinalistPm);
			}

			const runnerUpPm = 'You were awarded **' + runnerUpPoints + ' points** for being ' + (runnersUp.length > 1 ? 'a' :
				'the') + ' runner-up in the tournament! To see your total amount, use this command: ``' +
				Config.commandCharacter + 'rank ' + this.room.title + '``.';
			for (const runnerUp of runnersUp) {
				Storage.addPoints(this.room, Storage.tournamentLeaderboard, runnerUp, runnerUpPoints, this.format.id);
				const user = Users.get(runnerUp);
				if (user) user.say(runnerUpPm);
			}

			const winnerPm = 'You were awarded **' + winnerPoints + ' points** for being ' +
				(winners.length > 1 ? 'a' : 'the') + ' tournament winner! To see your total amount, use this command: ``' +
				Config.commandCharacter + 'rank ' + this.room.title + '``.';
			for (const winner of winners) {
				Storage.addPoints(this.room, Storage.tournamentLeaderboard, winner, winnerPoints, this.format.id);
				const user = Users.get(winner);
				if (user) user.say(winnerPm);
			}

			const placesHtml = Tournaments.getPlacesHtml('tournamentLeaderboard', (this.scheduled ? "Official " : "") + this.format.name,
				winners, runnersUp, semiFinalists, winnerPoints, runnerUpPoints, semiFinalistPoints);
			const formatLeaderboard = Tournaments.getFormatLeaderboardHtml(this.room, this.format);
			this.sayHtml("<div class='infobox-limited'>" + placesHtml + (formatLeaderboard ? "<br /><br />" + formatLeaderboard : "") +
				"</div>");
		}

		Storage.exportDatabase(this.room.id);
	}

	forceEnd(): void {
		if (this.timeout) clearTimeout(this.timeout);
		this.deallocate();
	}

	update(json: Partial<ITournamentUpdateJson & ITournamentEndJson>): void {
		Object.assign(this.updates, json);
	}

	updateEnd(): void {
		Object.assign(this.info, this.updates);
		if (this.updates.generator) this.setGenerator(this.updates.generator);
		if (this.updates.bracketData) {
			if (this.info.isStarted) {
				this.updateBracket();
			} else {
				if (this.updates.bracketData.users) {
					for (const user of this.updates.bracketData.users) {
						this.createPlayer(user);
					}
				}
			}
		}
		if (this.updates.format) {
			const format = Dex.getFormat(this.updates.format);
			if (format) {
				this.name = format.name;
				if (format.name === this.originalFormat) this.manuallyNamed = false;
			} else {
				this.name = this.updates.format;
				if (this.name !== (this.format.name + Dex.defaultCustomRulesName) && this.name !== Dex.getCustomFormatName(this.format)) {
					this.manuallyNamed = true;
				}
			}
		}

		this.updates = {};
	}

	updateBracket(): void {
		const players: Dict<string> = {};
		const losses: Dict<number> = {};
		if (this.info.bracketData.type === 'tree') {
			if (!this.info.bracketData.rootNode) return;
			const queue = [this.info.bracketData.rootNode];
			while (queue.length > 0) {
				const node = queue[0];
				queue.shift();
				if (!node.children) continue;

				if (node.children[0] && node.children[0].team) {
					const userA = Tools.toId(node.children[0].team);
					if (!players[userA]) players[userA] = node.children[0].team;
					if (node.children[1] && node.children[1].team) {
						const userB = Tools.toId(node.children[1].team);
						if (!players[userB]) players[userB] = node.children[1].team;
						if (node.state === 'finished') {
							if (node.result === 'win') {
								if (!losses[userB]) losses[userB] = 0;
								losses[userB]++;
							} else if (node.result === 'loss') {
								if (!losses[userA]) losses[userA] = 0;
								losses[userA]++;
							}
						}
					}
				}

				node.children.forEach(child => {
					queue.push(child);
				});
			}
		} else if (this.info.bracketData.type === 'table') {
			if (!this.info.bracketData.tableHeaders || !('cols' in this.info.bracketData.tableHeaders)) return;
			for (const name of this.info.bracketData.tableHeaders.cols) {
				const id = Tools.toId(name);
				if (!players[id]) players[id] = name;
			}
		}

		if (!this.totalPlayers) this.totalPlayers = Object.keys(players).length;

		// clear users who are now guests (currently can't be tracked)
		for (const i in this.players) {
			if (!(i in players)) delete this.players[i];
		}

		for (const i in players) {
			const player = this.createPlayer(players[i]) || this.players[i];
			if (player.eliminated) continue;
			const playerLosses = this.playerLosses.get(player);
			if (losses[i] && losses[i] !== playerLosses) {
				this.playerLosses.set(player, losses[i]);
				if (losses[i] >= this.generator) {
					player.eliminated = true;
				}
			}
		}
	}

	onBattleStart(usernameA: string, usernameB: string, roomid: string): void {
		const idA = Tools.toId(usernameA);
		const idB = Tools.toId(usernameB);
		if (!(idA in this.players) || !(idB in this.players)) {
			console.log("Player not found for " + usernameA + " vs. " + usernameB + " in " + roomid);
			return;
		}

		const room = Rooms.add(roomid);

		this.currentBattles.push({
			playerA: this.players[idA],
			playerB: this.players[idB],
			room,
		});

		this.battleRooms.push(room.publicId);

		if (this.generator === 1 && this.totalPlayers >= 4 && this.getRemainingPlayerCount() === 2) {
			this.sayCommand("/wall Final battle of the " + this.name + " " + this.activityType + ": <<" + room.id + ">>!");
		}

		if (this.joinBattles) {
			room.tournament = this;
			this.sayCommand("/join " + room.id);
		}
	}

	onBattleEnd(usernameA: string, usernameB: string, score: [string, string], roomid: string): void {
		const idA = Tools.toId(usernameA);
		const idB = Tools.toId(usernameB);
		if (!(idA in this.players) || !(idB in this.players)) {
			console.log("Player not found for " + usernameA + " vs. " + usernameB + " in " + roomid);
			return;
		}

		const room = Rooms.get(roomid);

		for (let i = 0; i < this.currentBattles.length; i++) {
			if (this.currentBattles[i].playerA === this.players[idA] && this.currentBattles[i].playerB === this.players[idB] &&
				this.currentBattles[i].room === room) {
				this.currentBattles.splice(i, 1);
				break;
			}
		}

		if (this.joinBattles) {
			if (room) room.sayCommand("/leave");
		}
	}

	onBattlePlayer(room: Room, slot: string, username: string): void {
		const id = Tools.toId(username);
		if (!(id in this.players)) return;

		let battleData = this.battleData.get(room);
		if (!battleData) {
			battleData = this.generateBattleData();
			this.battleData.set(room, battleData);
		}

		battleData.slots.set(this.players[id], slot);
	}

	onBattleTeamSize(room: Room, slot: string, size: number): void {
		const battleData = this.battleData.get(room);
		if (!battleData) return;

		battleData.remainingPokemon[slot] = size;
	}

	onBattleFaint(room: Room, pokemonArgument: string): void {
		const battleData = this.battleData.get(room);
		if (!battleData) return;

		const slot = pokemonArgument.substr(0, 2);
		if (slot in battleData.remainingPokemon) battleData.remainingPokemon[slot]--;
	}
}
