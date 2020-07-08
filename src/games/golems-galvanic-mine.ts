import type { Player } from "../room-activity";
import { Game } from "../room-game";
import type { Room } from "../rooms";
import type { GameCommandDefinitions, GameCommandReturnType, IGameFile } from "../types/games";
import type { User } from "../users";

const gen = 'gen7';
const data: {stones: string[]} = {
	stones: [],
};

class GolemsGalvanicMine extends Game {
	points = new Map<Player, number>();
	roundMines = new Map<Player, number>();
	roundStones: Dict<number> = {};
	roundTime: number = 7000;

	static loadData(room: Room | User): void {
		const items = Games.getItemsList(undefined, gen);
		for (const item of items) {
			if (item.megaStone || item.zMove) data.stones.push(item.name);
		}
	}

	onSignups(): void {
		if (!this.format.inputOptions.points) this.format.options.points = 30;
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 10000);
	}

	onNextRound(): void {
		this.roundStones = {};
		this.roundMines.clear();
		const html = this.getRoundHtml(this.getPlayerPoints);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.displayStones(), 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	displayStones(): void {
		const stones = this.sampleMany(data.stones, 9);
		const tr = '<tr style="text-align:center;line-height:5">';
		let html = '<center><table border="1">' + tr;
		let currentRowCount = 0;
		for (const stone of stones) {
			if (currentRowCount === 3) {
				html += '</tr>' + tr;
				currentRowCount = 0;
			}
			const value = this.random(6) + 1;
			this.roundStones[Tools.toId(stone)] = value;
			html += '<td style="width:125px">' + stone + '-' + value + '</td>';
			currentRowCount++;
		}
		html += "</tr></table></center>";
		const uhtmlName = this.uhtmlBaseName + '-stones';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.tallyPoints(), this.roundTime);
		});
		this.sayUhtml(uhtmlName, html);
	}

	tallyPoints(): void {
		let reachedMaxPoints = false;
		this.roundMines.forEach((value, player) => {
			let points = this.points.get(player) || 0;
			points += value;
			if (points >= this.format.options.points) {
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

	onEnd(): void {
		if (this.winners.size) this.convertPointsToBits(500 / this.format.options.points, 100 / this.format.options.points);
		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<GolemsGalvanicMine> = {
	mine: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user): GameCommandReturnType {
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundMines.has(player)) return false;
			const stone = Dex.getDex(gen).getItem(target);
			if (!stone || !data.stones.includes(stone.name)) {
				user.say("'" + target + "' is not a valid Z or Mega stone.");
				return false;
			}
			if (!(stone.id in this.roundStones)) return false;
			this.roundMines.set(player, this.roundStones[stone.id]);
			user.say("You successfully mined " + stone.name + "-" + this.roundStones[stone.id] + "!");
			delete this.roundStones[stone.id];
			return true;
		},
	},
};

export const game: IGameFile<GolemsGalvanicMine> = {
	aliases: ["golems", "ggm", "galvanicmine"],
	category: 'speed',
	commandDescriptions: [Config.commandCharacter + "mine [stone]"],
	commands,
	class: GolemsGalvanicMine,
	description: "Players try to be the fastest miner by mining the Z and Mega stones with the highest values! Stones and their values " +
		"are randomized each round.",
	freejoin: true,
	name: "Golem's Galvanic Mine",
	mascot: "Golem-Alola",
};
