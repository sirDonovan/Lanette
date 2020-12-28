import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";

type AchievementNames = "garbagecollector" | "technician";

interface ITrashedMove {
	name: string;
	points: number;
}

const data: {movePoints: Dict<number>; moves: string[]} = {
	movePoints: {},
	moves: [],
};

let highestBasePower: number = 0;

class TrubbishsTrash extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"garbagecollector": {name: "Garbage Collector", type: 'first', bits: 1000, description: 'trash first in every round'},
		"technician": {name: "Technician", type: 'special', bits: 1000, description: 'trash the weakest move in every round'},
	};

	canTrash: boolean = false;
	firstTrash: Player | false | undefined;
	inactiveRoundLimit: number = 5;
	maxPoints: number = 1000;
	points = new Map<Player, number>();
	roundTrashes = new Map<Player, ITrashedMove>();
	roundMoves = new Map<string, ITrashedMove>();
	revealTime: number = 10 * 1000;
	roundTime: number = 5 * 1000;
	winners = new Map<Player, number>();
	roundLimit: number = 20;
	weakestMove: string = '';
	weakestTrash: Player | false | undefined;

	static loadData(): void {
		const basePowers: Dict<number> = {};
		const movesList = Games.getMovesList(move => !move.id.startsWith('hiddenpower'));
		for (const move of movesList) {
			let basePower = move.basePower;
			if (typeof basePower !== 'number') basePower = parseInt(basePower);
			if (isNaN(basePower) || basePower <= 0) continue;
			if (basePower > highestBasePower) highestBasePower = basePower;
			basePowers[move.id] = basePower;
			data.moves.push(move.id);
		}

		for (const move of data.moves) {
			data.movePoints[move] = highestBasePower - basePowers[move];
		}
	}

	onSignups(): void {
		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		}
	}

	generateMoves(): void {
		const moves = this.sampleMany(data.moves, 3);
		const basePowers: {move: string; basePower: number}[] = [];
		for (let i = 0; i < moves.length; i++) {
			const move = Dex.getExistingMove(moves[i]);
			basePowers.push({move: move.name, basePower: data.movePoints[moves[i]]});
			this.roundMoves.set(move.id, {name: move.name, points: data.movePoints[moves[i]]});
			moves[i] = move.name;
		}
		basePowers.sort((a, b) => a.basePower - b.basePower);
		this.weakestMove = basePowers[0].move;
		const text = "Trubbish found **" + moves.join(", ") + "**!";
		this.on(text, () => {
			this.canTrash = true;
			this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
		});
		this.say(text);
	}

	onNextRound(): void {
		this.canTrash = false;
		if (this.round > 1) {
			let highestPoints = 0;
			if (this.roundTrashes.size) {
				if (this.inactiveRounds) this.inactiveRounds = 0;

				const trashQueue: {player: Player; move: string; points: number}[] = [];
				let firstTrash = true;
				this.roundTrashes.forEach((move, player) => {
					if (player.eliminated) return;
					if (firstTrash) {
						if (this.firstTrash === undefined) {
							this.firstTrash = player;
						} else {
							if (this.firstTrash && this.firstTrash !== player) this.firstTrash = false;
						}
						firstTrash = false;
					}

					if (move.name === this.weakestMove) {
						if (this.weakestTrash === undefined) {
							this.weakestTrash = player;
						} else {
							if (this.weakestTrash && this.weakestTrash !== player) this.weakestTrash = false;
						}
					} else if (this.weakestTrash === player) {
						this.weakestTrash = false;
					}
					trashQueue.push({player, move: move.name, points: move.points});
				});
				trashQueue.sort((a, b) => b.points - a.points);
				for (const slot of trashQueue) {
					const player = slot.player;
					let points = this.points.get(player) || 0;
					points += slot.points;
					this.points.set(player, points);
					player.say(slot.move + " was worth " + slot.points + " points! Your total score is now: " + points + ".");
					if (points > highestPoints) highestPoints = points;
				}
			} else {
				this.inactiveRounds++;
				if (this.inactiveRounds === this.inactiveRoundLimit) {
					this.inactivityEnd();
					return;
				}
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
		const html = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.generateMoves(), this.revealTime);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (points && points >= this.maxPoints) {
				this.winners.set(player, 1);
				if (this.firstTrash === player) this.unlockAchievement(player, TrubbishsTrash.achievements.garbagecollector);
				if (this.weakestTrash === player) this.unlockAchievement(player, TrubbishsTrash.achievements.technician);
			}
		}

		this.convertPointsToBits(0.5, 0.1);
		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<TrubbishsTrash> = {
	trash: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canTrash) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundTrashes.has(player)) return false;
			const id = Tools.toId(target);
			const move = this.roundMoves.get(id);
			if (!move) return false;
			this.roundTrashes.set(player, move);
			this.roundMoves.delete(id);
			return true;
		},
	},
};

export const game: IGameFile<TrubbishsTrash> = {
	aliases: ["trubbishs", "tt"],
	category: 'speed',
	commandDescriptions: [Config.commandCharacter + "trash [move]"],
	commands,
	class: TrubbishsTrash,
	description: "Players help Trubbish trash the weakest moves each round!",
	freejoin: true,
	name: "Trubbish's Trash",
	mascot: "Trubbish",
};
