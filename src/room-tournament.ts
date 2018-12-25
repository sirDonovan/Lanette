import { IFormat } from "./dex";
import { Activity } from "./room-activity";

interface IBracketNode {
	team: string;
	children: IBracketNode[];
	state: string;
	result: string;
}

interface ITournamentInfo {
	format: string;
	bracketData: {type: string, rootNode?: IBracketNode, tableHeaders?: {cols: any[], rows: any[]}};
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
	createTime = Date.now();
	generator = 1;
	info = {bracketData: {type: ''}, results: [], format: ''} as ITournamentInfo;
	isRoundRobin = false;
	maxRounds = 6;
	playerCap = Tournaments.defaultCap;
	startTime = 0;
	totalPlayers = 0;
	updates = {} as Dict<any>;

	format!: IFormat;

	initialize(format: IFormat, generator: string) {
		this.format = format;
		this.name = format.name;
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
				for (let i = 0, len = data.tableHeaders.cols.length; i < len; i++) {
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
			const player = this.addPlayer(players[i]);
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
