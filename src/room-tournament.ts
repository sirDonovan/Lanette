import { Activity } from "./room-activity";
import { IFormat } from "./types/in-game-data-types";

interface IBracketNode {
	team: string;
	children: IBracketNode[];
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
	results: string[];
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
	info: ITournamentUpdateJSON = {
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
		teambuilderFormat: '',
	};
	isRoundRobin: boolean = false;
	maxRounds: number = 6;
	startTime: number = 0;
	totalPlayers: number = 0;
	updates: Partial<ITournamentUpdateJSON> = {};

	format!: IFormat;
	playerCap!: number;

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
