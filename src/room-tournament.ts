import { Activity } from "./room-activity";
import { Room } from "./rooms";
import { IFormat } from "./types/in-game-data-types";

interface IBracketNode {
	team: string;
	children?: IBracketNode[];
	state: string;
	result: string;
}

interface IBracketData {
	type: string;
	rootNode?: IBracketNode;
	tableHeaders?: {cols: any[], rows: any[]};
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
	activityType: string = 'tournament';
	createTime: number = Date.now();
	generator: number = 1;
	info: ITournamentUpdateJSON & ITournamentEndJSON = {
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
	maxRounds: number = 6;
	scheduled: boolean = false;
	startTime: number = 0;
	totalPlayers: number = 0;
	updates: Partial<ITournamentUpdateJSON> = {};

	format!: IFormat;
	playerCap!: number;
	room!: Room;

	initialize(format: IFormat, generator: string, playerCap: number) {
		this.format = format;
		this.playerCap = playerCap;
		this.name = format.name;
		this.id = format.id;

		const generatorName = generator.split(" ")[0];
		if (generatorName in generators) {
			this.generator = generators[generatorName];
		} else {
			const generatorNumber = parseInt(generator.split("-tuple")[0]);
			if (!isNaN(generatorNumber)) this.generator = generatorNumber;
		}
		this.isRoundRobin = Tools.toId(generator).includes('roundrobin');
	}

	deallocate() {
		this.room.tournament = null;
	}

	onEnd() {
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
		if (((this.format.customRules && Config.rankedCustomTournaments.includes(this.room.id)) || (!this.format.customRules && Config.rankedTournaments.includes(this.room.id))) &&
			!(this.format.unranked && !Config.ignoreDefaultUnrankedTournaments.includes(this.room.id))) {
			const text = ["runner" + (runnersUp.length > 1 ? "s" : "") + "-up " + Tools.joinList(runnersUp, '**'), "winner" + (winners.length > 1 ? "s" : "") + " " + Tools.joinList(winners, '**')];
			if (semiFinalists.length) text.unshift("semi-finalist" + (semiFinalists.length > 1 ? "s" : "") + " " + Tools.joinList(semiFinalists, '**'));
			this.room.say('/wall Congratulations to ' + Tools.joinList(text));
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
		if (Config.allowScriptedGames.includes(this.room.id)) {
			pointsName = "bits";
			semiFinalistPoints = Math.round((100 * multiplier));
			runnerUpPoints = Math.round((200 * multiplier));
			winnerPoints = Math.round((300 * multiplier));
		} else {
			semiFinalistPoints = Math.round((1 * multiplier));
			runnerUpPoints = Math.round((2 * multiplier));
			winnerPoints = Math.round((3 * multiplier));
		}

		const pointsHtml = ["runner" + (runnersUp.length > 1 ? "s" : "") + "-up " + Tools.joinList(runnersUp, '<b>', '</b>'), "winner" + (winners.length > 1 ? "s" : "") + " " + Tools.joinList(winners, '<b>', '</b>')];
		if (semiFinalists.length) pointsHtml.unshift("semi-finalist" + (semiFinalists.length > 1 ? "s" : "") + " " + Tools.joinList(semiFinalists, '<b>', '</b>'));

		const playerStatsHtml = '';
		// if (showPlayerStats) playerStatsHtml = Tournaments.getPlayerStatsHtml(this.room, this.format);

		this.room.sayHtml("<div class='infobox-limited'>Congratulations to " + Tools.joinList(pointsHtml) + (playerStatsHtml ? "<br><br>" + playerStatsHtml : "") + "</div>");

		const winnerPm = 'You were awarded **' + winnerPoints + ' ' + pointsName + '** for being ' + (winners.length > 1 ? 'a' : 'the') + ' tournament winner! To see your total amount, use this command: ``.rank ' + this.room.title + '``';
		for (let i = 0, len = winners.length; i < len; i++) {
			Storage.addPoints(this.room, winners[i], winnerPoints, this.format.id);
			// Client.outgoingPms[Tools.toId(winners[i])] = winnerPm;
			const user = Users.get(winners[i]);
			if (user) user.say(winnerPm);
		}

		const runnerUpPm = 'You were awarded **' + runnerUpPoints + ' ' + pointsName + '** for being a runner-up in the tournament! To see your total amount, use this command: ``.rank ' + this.room.title + '``';
		for (let i = 0, len = runnersUp.length; i < len; i++) {
			Storage.addPoints(this.room, runnersUp[i], runnerUpPoints, this.format.id);
			// Client.outgoingPms[Tools.toId(runnersUp[i])] = runnerUpPm;
			const user = Users.get(runnersUp[i]);
			if (user) user.say(runnerUpPm);
		}

		const semiFinalistPm = 'You were awarded **' + semiFinalistPoints + ' ' + pointsName + '** for being a semi-finalist in the tournament! To see your total amount, use this command: ``.rank ' + this.room.title + '``';
		for (let i = 0, len = semiFinalists.length; i < len; i++) {
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

	onStart() {
		this.startTime = Date.now();
		let maxRounds = 0;
		let rounds = Math.ceil((Math.log(this.playerCount) / Math.log(2)));
		let generator = this.generator;
		while (generator > 0) {
			maxRounds += rounds;
			rounds--;
			generator--;
		}
		this.maxRounds = maxRounds;
		this.totalPlayers = this.playerCount;
	}

	update() {
		Object.assign(this.info, this.updates);
		if (this.updates.bracketData && this.started) this.updateBracket();
		if (this.updates.format) {
			const format = Dex.getFormat(this.updates.format);
			if (format) {
				this.name = format.name;
			} else {
				this.name = this.updates.format;
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
					const node = queue.shift();
					if (!node) break;
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
			}
		} else if (data.type === 'table') {
			if (data.tableHeaders && data.tableHeaders.cols) {
				for (let i = 0; i < data.tableHeaders.cols.length; i++) {
					const player = Tools.toId(data.tableHeaders.cols[i]);
					if (!players[player]) players[player] = data.tableHeaders.cols[i];
				}
			}
		}
		if (!this.playerCount) {
			const len = Object.keys(players).length;
			let maxRounds = 0;
			let rounds = Math.ceil((Math.log(len) / Math.log(2)));
			let generator = this.generator;
			while (generator > 0) {
				maxRounds += rounds;
				rounds--;
				generator--;
			}
			this.maxRounds = maxRounds;
			this.totalPlayers = len;
			this.playerCount = len;
		}

		// clear users who are now guests (currently can't be tracked)
		for (const i in this.players) {
			if (!(i in players)) delete this.players[i];
		}

		for (const i in players) {
			const player = this.createPlayer(players[i]);
			if (!player || player.eliminated) continue;
			if (losses[i] && (!player.losses || player.losses < losses[i])) {
				player.losses = losses[i];
				if (player.losses >= this.generator) {
					player.eliminated = true;
					continue;
				}
			}
		}
	}
}
