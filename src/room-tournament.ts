import { Activity, Player } from "./room-activity";
import { Room } from "./rooms";
import { IFormat } from "./types/in-game-data-types";

interface IBracketNode {
	readonly result: string;
	readonly state: 'available' | 'challenging' | 'inprogress' | 'finished' | 'unavailable';
	readonly team: string;
	readonly children?: IBracketNode[];
}

interface IBracketData {
	readonly type: string;
	readonly rootNode?: IBracketNode;
	readonly tableHeaders?: {cols: any[], rows: any[]};
}

interface IBattleData {
	readonly playerA: Player;
	readonly playerB: Player;
	readonly roomid: string;
}

export interface ITournamentUpdateJSON {
	/** An object representing the current state of the bracket */
	bracketData: IBracketData;
	/** A list of opponents that can currently challenge you */
	challengeBys: string[];
	/** The name of the opponent that has challenged you */
	challenged: string;
	/** A list of opponents that you can currently challenge */
	challenges: string[];
	/** The name of the opponent that you are challenging */
	challenging: string;
	/** The tournament's custom name or the format being used */
	format: string;
	/** The type of bracket being used by the tournament */
	generator: string;
	/** Whether or not you have joined the tournament */
	isJoined: boolean;
	/** Whether or not the tournament has started */
	isStarted: boolean;
	/** The player cap that was set or 0 if it was removed */
	playerCap: number;
	/** The format being used; sent if a custom name was set */
	teambuilderFormat: string;
}

export interface ITournamentEndJSON {
	/** An object representing the final state of the bracket */
	bracketData: IBracketData;
	/** The tournament's custom name or the format that was used */
	format: string;
	/** The type of bracket that was used by the tournament */
	generator: string;
	/** The name(s) of the winner(s) of the tournament */
	results: string[][];
}

const generators: Dict<number> = {
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
	readonly battleData: IBattleData[] = [];
	readonly battleRooms: string[] = [];
	readonly createTime: number = Date.now();
	readonly currentBattles: IBattleData[] = [];
	generator: number = 1;
	readonly info: ITournamentUpdateJSON & ITournamentEndJSON = {
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
	manuallyNamed: boolean = false;
	originalFormat: string = '';
	scheduled: boolean = false;
	startTimer: NodeJS.Timer | null = null;
	totalPlayers: number = 0;
	updates: Partial<ITournamentUpdateJSON> = {};

	format!: IFormat;
	playerCap!: number;
	readonly room!: Room;

	initialize(format: IFormat, generator: string, playerCap: number, name?: string) {
		this.format = format;
		this.playerCap = playerCap;
		this.name = name || format.name;
		this.originalFormat = format.name;
		this.id = format.id;
		this.uhtmlBaseName = 'tournament-' + this.id;

		this.setGenerator(generator);
	}

	setGenerator(generator: string) {
		const generatorName = generator.split(" ")[0];
		if (generatorName in generators) {
			this.generator = generators[generatorName];
		} else {
			const generatorNumber = parseInt(generator.split("-tuple")[0]);
			if (!isNaN(generatorNumber)) this.generator = generatorNumber;
		}
		this.isRoundRobin = Tools.toId(generator).includes('roundrobin');
	}

	setCustomFormatName() {
		const previousName = this.name;
		const customFormatName = Dex.getCustomFormatName(this.room, this.format);
		if (this.format.customRules && (customFormatName === this.format.name || customFormatName.length > 100)) {
			this.name = this.format.name + " (custom rules)";
		} else {
			this.name = customFormatName;
		}

		if (this.name !== previousName) this.sayCommand("/tour name " + this.name);
	}

	adjustCap() {
		if (this.playerCount % 16 === 0) {
			this.sayCommand("/tour start");
			return;
		}
		let newCap = this.playerCount + 1;
		while (newCap % 16 !== 0) {
			newCap += 1;
		}
		CommandParser.parse(this.room, Users.self, Config.commandCharacter + "tournamentcap " + newCap);
	}

	onStart() {
		if (this.startTimer) clearTimeout(this.startTimer);
	}

	deallocate() {
		if (this.adjustCapTimer) clearTimeout(this.adjustCapTimer);
		if (this.startTimer) clearTimeout(this.startTimer);
		this.room.tournament = null;
	}

	onEnd() {
		const database = Storage.getDatabase(this.room);
		if (!database.pastTournaments) database.pastTournaments = [];
		database.pastTournaments.unshift(this.format.name);
		while (database.pastTournaments.length > 8) {
			database.pastTournaments.pop();
		}
		let winners: string[] = [];
		let runnersUp: string[] = [];
		let semiFinalists: string[] = [];
		if (this.info.bracketData.type === 'tree') {
			const data = this.info.bracketData.rootNode;
			if (data && data.children && this.generator === 1) {
				const winner = data.team;
				winners.push(winner);
				let runnerUp = '';
				if (data.children[0].team === winner) {
					runnerUp = data.children[1].team;
				} else {
					runnerUp = data.children[0].team;
				}
				runnersUp.push(runnerUp);

				if (data.children[0].children && data.children[0].children.length) {
					if (data.children[0].children[0].team === runnerUp || data.children[0].children[0].team === winner) {
						semiFinalists.push(data.children[0].children[1].team);
					} else {
						semiFinalists.push(data.children[0].children[0].team);
					}
				}
				if (data.children[1].children && data.children[1].children.length) {
					if (data.children[1].children[0].team === runnerUp || data.children[1].children[0].team === winner) {
						semiFinalists.push(data.children[1].children[1].team);
					} else {
						semiFinalists.push(data.children[1].children[0].team);
					}
				}
			}
		} else {
			if (this.info.results[0]) winners = this.info.results[0];
			if (this.info.results[1]) runnersUp = this.info.results[1];
			if (this.info.results[2]) semiFinalists = this.info.results[2];
		}
		const singleElimination = !this.isRoundRobin && this.generator === 1;
		if (!winners.length || !runnersUp.length || (singleElimination && semiFinalists.length < 2)) return;
		if ((this.format.customRules && (!Config.rankedCustomTournaments || !Config.rankedCustomTournaments.includes(this.room.id))) ||
			(!this.format.customRules && (!Config.rankedTournaments || !Config.rankedTournaments.includes(this.room.id))) ||
			(this.format.unranked && Config.useDefaultUnrankedTournaments && Config.useDefaultUnrankedTournaments.includes(this.room.id))) {
			const text = ["runner" + (runnersUp.length > 1 ? "s" : "") + "-up " + Tools.joinList(runnersUp, '**'), "winner" + (winners.length > 1 ? "s" : "") + " " + Tools.joinList(winners, '**')];
			if (semiFinalists.length) text.unshift("semi-finalist" + (semiFinalists.length > 1 ? "s" : "") + " " + Tools.joinList(semiFinalists, '**'));
			this.sayCommand('/wall Congratulations to ' + Tools.joinList(text));
			return true;
		}

		let multiplier = 1;
		if (!this.format.teamLength || !this.format.teamLength.battle || this.format.teamLength.battle > 2) {
			if (this.totalPlayers >= 32) {
				multiplier += ((Math.floor(this.totalPlayers / 32)) * 0.5);
			}
		}
		if (this.scheduled) multiplier *= 2.5;

		let pointsName = 'points';
		let semiFinalistPoints: number;
		let runnerUpPoints: number;
		let winnerPoints: number;
		if (Config.allowScriptedGames && Config.allowScriptedGames.includes(this.room.id)) {
			pointsName = "bits";
			semiFinalistPoints = Math.round((100 * multiplier));
			runnerUpPoints = Math.round((200 * multiplier));
			winnerPoints = Math.round((300 * multiplier));
		} else {
			semiFinalistPoints = Math.round((1 * multiplier));
			runnerUpPoints = Math.round((2 * multiplier));
			winnerPoints = Math.round((3 * multiplier));
		}

		const pointsHtml: string[] = [];
		pointsHtml.push("runner" + (runnersUp.length > 1 ? "s" : "") + "-up " + Tools.joinList(runnersUp, '<b>', '</b>') + " for earning " + runnerUpPoints + " points");
		pointsHtml.push("winner" + (winners.length > 1 ? "s" : "") + " " + Tools.joinList(winners, '<b>', '</b>') + " for earning " + winnerPoints + " points");
		if (semiFinalists.length) {
			pointsHtml.unshift("semi-finalist" + (semiFinalists.length > 1 ? "s" : "") + " " + Tools.joinList(semiFinalists, '<b>', '</b>') + " for earning " + semiFinalistPoints + " point" + (semiFinalistPoints > 1 ? "s" : ""));
		}

		const playerStatsHtml = '';
		// if (showPlayerStats) playerStatsHtml = Tournaments.getPlayerStatsHtml(this.room, this.format);

		this.sayHtml("<div class='infobox-limited'>Congratulations to " + Tools.joinList(pointsHtml) + "!" + (playerStatsHtml ? "<br><br>" + playerStatsHtml : "") + "</div>");

		const winnerPm = 'You were awarded **' + winnerPoints + ' ' + pointsName + '** for being ' + (winners.length > 1 ? 'a' : 'the') + ' tournament winner! To see your total amount, use this command: ``.rank ' + this.room.title + '``';
		for (let i = 0; i < winners.length; i++) {
			Storage.addPoints(this.room, winners[i], winnerPoints, this.format.id);
			// Client.outgoingPms[Tools.toId(winners[i])] = winnerPm;
			const user = Users.get(winners[i]);
			if (user) user.say(winnerPm);
		}

		const runnerUpPm = 'You were awarded **' + runnerUpPoints + ' ' + pointsName + '** for being ' + (runnersUp.length > 1 ? 'a' : 'the') + ' runner-up in the tournament! To see your total amount, use this command: ``.rank ' + this.room.title + '``';
		for (let i = 0; i < runnersUp.length; i++) {
			Storage.addPoints(this.room, runnersUp[i], runnerUpPoints, this.format.id);
			// Client.outgoingPms[Tools.toId(runnersUp[i])] = runnerUpPm;
			const user = Users.get(runnersUp[i]);
			if (user) user.say(runnerUpPm);
		}

		const semiFinalistPm = 'You were awarded **' + semiFinalistPoints + ' ' + pointsName + '** for being ' + (semiFinalists.length > 1 ? 'a' : 'the') + ' semi-finalist in the tournament! To see your total amount, use this command: ``.rank ' + this.room.title + '``';
		for (let i = 0; i < semiFinalists.length; i++) {
			Storage.addPoints(this.room, semiFinalists[i], semiFinalistPoints, this.format.id);
			// Client.outgoingPms[Tools.toId(semiFinalists[i])] = semiFinalistPm;
			const user = Users.get(semiFinalists[i]);
			if (user) user.say(semiFinalistPm);
		}
	}

	forceEnd() {
		if (this.timeout) clearTimeout(this.timeout);
		this.deallocate();
	}

	update() {
		Object.assign(this.info, this.updates);
		if (this.updates.generator) this.setGenerator(this.updates.generator);
		if (this.updates.bracketData && this.started) this.updateBracket();
		if (this.updates.format) {
			const format = Dex.getFormat(this.updates.format);
			if (format) {
				this.name = format.name;
				if (format.name === this.originalFormat) this.manuallyNamed = false;
			} else {
				this.name = this.updates.format;
				this.manuallyNamed = true;
			}
		}
		this.updates = {};
	}

	updateBracket() {
		const data = this.info.bracketData;
		const players: Dict<string> = {};
		const losses: Dict<number> = {};
		if (data.type === 'tree') {
			if (data.rootNode) {
				const queue = [data.rootNode];
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
						if (child) queue.push(child);
					});
				}
			}
		} else if (data.type === 'table') {
			if (data.tableHeaders && data.tableHeaders.cols) {
				for (let i = 0; i < data.tableHeaders.cols.length; i++) {
					const player = Tools.toId(data.tableHeaders.cols[i]);
					if (!players[player]) players[player] = data.tableHeaders.cols[i];
				}
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
			if (losses[i] && losses[i] !== player.losses) {
				player.losses = losses[i];
				if (player.losses >= this.generator) {
					player.eliminated = true;
				}
			}
		}
	}

	onBattleStart(usernameA: string, usernameB: string, roomid: string) {
		const idA = Tools.toId(usernameA);
		const idB = Tools.toId(usernameB);
		if (!(idA in this.players) || !(idB in this.players)) throw new Error("Player not found for " + usernameA + " vs. " + usernameB + " in " + roomid);
		const battleData: IBattleData = {
			playerA: this.players[idA],
			playerB: this.players[idB],
			roomid,
		};
		this.battleData.push(battleData);
		this.currentBattles.push(battleData);

		this.battleRooms.push(roomid);

		if (this.generator === 1 && this.getRemainingPlayerCount() === 2) this.sayCommand("/wall Final battle of the " + this.name + " " + this.activityType + ": <<" + roomid + ">>!");
	}

	onBattleEnd(usernameA: string, usernameB: string, score: [string, string], roomid: string) {
		const idA = Tools.toId(usernameA);
		const idB = Tools.toId(usernameB);
		if (!(idA in this.players) || !(idB in this.players)) throw new Error("Player not found for " + usernameA + " vs. " + usernameB + " in " + roomid);
		for (let i = 0; i < this.currentBattles.length; i++) {
			if (this.currentBattles[i].playerA === this.players[idA] && this.currentBattles[i].playerB === this.players[idB] && this.currentBattles[i].roomid === roomid) {
				this.currentBattles.splice(i, 1);
				break;
			}
		}
	}
}
