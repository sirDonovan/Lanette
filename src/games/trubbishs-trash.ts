import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";

interface ITrashedMove {
	name: string;
	points: number;
}

const name = "Trubbish's Trash";
const data: {movePoints: Dict<number>, moves: string[]} = {
	movePoints: {},
	moves: [],
};
let highestBasePower: number = 0;
let loadedData = false;

class TrubbishsTrash extends Game {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const basePowers: Dict<number> = {};
		const movesList = Dex.getMovesList(move => !move.id.startsWith('hiddenpower'));
		for (let i = 0; i < movesList.length; i++) {
			const move = movesList[i];
			let basePower = move.basePower;
			if (typeof basePower !== 'number') basePower = parseInt(basePower);
			if (isNaN(basePower) || basePower <= 0) continue;
			if (basePower > highestBasePower) highestBasePower = basePower;
			basePowers[move.id] = basePower;
			data.moves.push(move.id);
		}

		for (let i = 0; i < data.moves.length; i++) {
			data.movePoints[data.moves[i]] = highestBasePower - basePowers[data.moves[i]];
		}

		loadedData = true;
	}

	canTrash: boolean = false;
	// firstTrash: Player | null;
	maxPoints: number = 1000;
	points = new Map<Player, number>();
	roundTrashes = new Map<Player, ITrashedMove>();
	roundMoves = new Map<string, ITrashedMove>();
	revealTime: number = 10 * 1000;
	roundTime: number = 5 * 1000;
	winners = new Map<Player, number>();
	weakestTrash: Player | boolean = false;
	roundLimit: number = 20;
	// weakestMove: string = '';

	onSignups() {
		if (this.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		}
	}

	generateMoves() {
		const moves = this.sampleMany(data.moves, 3);
		// let basePowers = [];
		for (let i = 0; i < moves.length; i++) {
			const move = Dex.getExistingMove(moves[i]);
			// basePowers.push({move: move.name, basePower: data.movePoints[moves[i]]});
			this.roundMoves.set(move.id, {name: move.name, points: data.movePoints[moves[i]]});
			moves[i] = move.name;
		}
		// basePowers.sort(function (a, b) { return a.basePower - b.basePower; });
		// this.weakestMove = basePowers[0].move;
		const text = "Trubbish found **" + moves.join(", ") + "**!";
		this.on(text, () => {
			this.canTrash = true;
			this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
		});
		this.say(text);
	}

	onNextRound() {
		this.canTrash = false;
		if (this.round > 1) {
			const trash: {player: Player, move: string, points: number}[] = [];
			// let actions = 0;
			this.roundTrashes.forEach((move, player) => {
				if (player.eliminated) return;
				// if (actions === 0) this.markFirstAction(player, 'firstTrash');
				// actions++;
				trash.push({player, move: move.name, points: move.points});
			});
			trash.sort((a, b) => b.points - a.points);
			let highestPoints = 0;
			for (let i = 0; i < trash.length; i++) {
				const player = trash[i].player;
				let points = this.points.get(player) || 0;
				points += trash[i].points;
				this.points.set(player, points);
				player.say(trash[i].move + " was worth " + trash[i].points + " points! Your total score is now: " + points + ".");
				if (points > highestPoints) highestPoints = points;
				/*
				if (trash[i].move === this.weakestMove) {
					this.markFirstAction(player, 'weakestTrash');
				} else if (this.weakestTrash === player) {
					this.weakestTrash = true;
				}
				*/
			}
			this.roundTrashes.clear();
			this.roundMoves.clear();
			if (highestPoints >= this.maxPoints) {
				this.timeout = setTimeout(() => this.end(), 3000);
				return;
			}
			if (this.round > this.roundLimit) {
				this.timeout = setTimeout(() => {
					this.say("We've reached the end of the game!");
					this.maxPoints = highestPoints;
					this.timeout = setTimeout(() => this.end(), 3000);
				}, 3000);
				return;
			}
		}
		const html = this.getRoundHtml(this.getPlayerPoints);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.generateMoves(), this.revealTime);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
		for (const i in this.players) {
			const player = this.players[i];
			if (player.eliminated) continue;
			const points = this.points.get(player);
			if (points && points >= this.maxPoints) this.winners.set(player, 1);
		}
		this.say("**Winner" + (this.winners.size > 1 ? "s" : "") + "**: " + this.getPlayerNames(this.winners));
		this.convertPointsToBits(0.5, 0.1);
		/*
		this.winners.forEach((value, user) => {
			if (this.firstTrash === user) Games.unlockAchievement(this.room, user, "Garbage Collector", this);
			if (this.weakestTrash === user) Games.unlockAchievement(this.room, user, "Technician", this);
		});
		*/
	}
}

const commands: Dict<ICommandDefinition<TrubbishsTrash>> = {
	trash: {
		command(target, room, user) {
			if (!this.canTrash) return;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundTrashes.has(player)) return;
			const id = Tools.toId(target);
			const move = this.roundMoves.get(id);
			if (!move) return;
			this.roundTrashes.set(player, move);
			this.roundMoves.delete(id);
		},
	},
};

export const game: IGameFile<TrubbishsTrash> = {
	aliases: ["trubbishs", "tt"],
	commandDescriptions: [Config.commandCharacter + "trash [move]"],
	commands,
	class: TrubbishsTrash,
	description: "Players help Trubbish trash the weakest moves each round!",
	freejoin: true,
	name,
	mascot: "Trubbish",
};
