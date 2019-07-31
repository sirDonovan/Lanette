import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";

const name = "Golem's Galvanic Mine";
const allStones: string[] = [];
let loadedData = false;

class GolemsGalvanicMine extends Game {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const items = Dex.getItemsList();
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.megaStone || item.zMove) allStones.push(item.name);
		}

		loadedData = true;
	}

	points = new Map<Player, number>();
	roundMines = new Map<Player, number>();
	roundStones: Dict<number> = {};
	roundTime: number = 7000;

	onSignups() {
		if (!this.inputOptions.points) this.options.points = 30;
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 10000);
	}

	onNextRound() {
		this.roundStones = {};
		this.roundMines.clear();
		const html = this.getRoundHtml(this.getPlayerPoints);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.displayStones(), 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	displayStones() {
		// <center><table border="1"><tr style="text-align:center;line-height:5"><td style="width:125px">Flyinium Z-1</td><td style="width:125px">Charizardite Y-1</td><td style="width:125px">Galladite-6</td></tr><tr style="text-align:center;line-height:5"><td style="width:125px">Sharpedonite-2</td><td style="width:125px">Kommonium Z-4</td><td style="width:125px">Psychium Z-3</td></tr><tr style="text-align:center;line-height:5"><td style="width:125px">Gardevoirite-2</td><td style="width:125px">Sceptilite-1</td><td style="width:125px">Incinium Z-4</td></tr><tr style="text-align:center;line-height:5"></tr></table></center><div style="float:right;color:#888;font-size:8pt">[Lanette Bot]</div><div style="clear:both"></div>
		const stones = Tools.sampleMany(allStones, 9);
		const tr = '<tr style="text-align:center;line-height:5">';
		let html = '<center><table border="1">' + tr;
		let currentRowCount = 0;
		for (let i = 0; i < stones.length; i++) {
			if (currentRowCount === 3) {
				html += '</tr>' + tr;
				currentRowCount = 0;
			}
			const value = Tools.random(6) + 1;
			this.roundStones[Tools.toId(stones[i])] = value;
			html += '<td style="width:125px">' + stones[i] + '-' + value + '</td>';
			currentRowCount++;
		}
		html += "</tr></table></center>";
		const uhtmlName = this.uhtmlBaseName + '-stones';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.tallyPoints(), this.roundTime);
		});
		this.sayUhtml(uhtmlName, html);
	}

	tallyPoints() {
		let reachedMaxPoints = false;
		this.roundMines.forEach((value, player) => {
			let points = this.points.get(player) || 0;
			points += value;
			if (points >= this.options.points) {
				if (!reachedMaxPoints) reachedMaxPoints = true;
				this.winners.set(player, points);
			}
			this.points.set(player, points);
		});

		if (reachedMaxPoints) {
			this.end();
		} else {
			this.nextRound();
		}
	}

	onEnd() {
		if (this.parentGame && this.parentGame.id === 'battlefrontier') {
			let highestPoints = 0;
			for (const i in this.players) {
				const player = this.players[i];
				if (player.eliminated) continue;
				const points = this.points.get(player) || 0;
				if (points > highestPoints) {
					this.winners.clear();
					this.winners.set(player, 1);
					highestPoints = points;
				} else if (points === highestPoints) {
					this.winners.set(player, 1);
				}
			}
		}
		if (this.winners.size) {
			this.say("**Winner" + (this.winners.size > 1 ? "s" : "") + "**: " + this.getPlayerNames(this.winners));
			this.convertPointsToBits(500 / this.options.points, 100 / this.options.points);
		} else {
			this.say("No winners this game!");
		}
	}
}

const commands: Dict<ICommandDefinition<GolemsGalvanicMine>> = {
	mine: {
		command(target, room, user) {
			if (!this.started || (user.id in this.players && this.players[user.id].eliminated)) return;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundMines.has(player)) return;
			const stone = Dex.getItem(target);
			if (!stone || !allStones.includes(stone.name)) return user.say("'" + target + "' is not a valid Z or Mega stone.");
			if (!(stone.id in this.roundStones)) return;
			this.roundMines.set(player, this.roundStones[stone.id]);
			user.say("You successfully mined " + stone.name + "-" + this.roundStones[stone.id] + "!");
			delete this.roundStones[stone.id];
		},
	},
};

export const game: IGameFile<GolemsGalvanicMine> = {
	aliases: ["golems", "ggm", "galvanicmine"],
	battleFrontierCategory: 'Speed',
	commandDescriptions: [Config.commandCharacter + "mine [stone]"],
	commands,
	class: GolemsGalvanicMine,
	description: "Players try to be the fastest miner by mining the Z and Mega stones with the highest values! Stones and their values are randomized each round.",
	freejoin: true,
	name,
	mascot: "Golem-Alola",
};
