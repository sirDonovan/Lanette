import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

const maxPoints = 5;

class ThievulsSweetThief extends ScriptedGame {
	canLateJoin = true;
	canSteal: boolean = false;
	currentHolder: Player | null = null;
	maxPlayers: number = 20;
	points = new Map<Player, number>();
	roundTimes: number[] = [7000, 8000, 9000, 10000];
	winnerPointsToBits = 100;
	loserPointsToBits = 25;

	onRenamePlayer(player: Player): void {
		if (!this.started || player.eliminated || player !== this.currentHolder) return;
		this.eliminatePlayer(player);
		this.say(player.name + " was DQed for changing their username while holding the sweets!");
		this.setTimeout(() => this.nextRound(), 5000);
	}

	onRemovePlayer(player: Player): void {
		if (player === this.currentHolder) {
			this.say(player.name + " left the game while holding the sweets!");
			this.setTimeout(() => this.nextRound(), 5000);
		}
	}

	onStart(): void {
		this.nextRound();
	}

	takeBackSweets(): void {
		if (this.timeout) clearTimeout(this.timeout);

		const text = "**Thievul stole the sweets back!**";
		this.on(text, () => {
			if (this.currentHolder) {
				const points = this.addPoints(this.currentHolder, 1);
				this.say("**" + this.currentHolder.name + "** advances to **" + points + "** point" + (points > 1 ? "s" : "") + "!");
				if (points === maxPoints) {
					this.winners.set(this.currentHolder, points);
					this.end();
					return;
				}
				this.currentHolder = null;
			}

			if (this.getRemainingPlayerCount() < 2) return this.end();
			this.setTimeout(() => this.nextRound(), 5000);
		});
		this.say(text);
	}

	onNextRound(): void {
		const remainingPlayerCount = this.getRemainingPlayerCount();
		if (remainingPlayerCount < 2) {
			return this.end();
		}

		const html = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.setTimeout(() => {
				const holder = this.shufflePlayers()[0];
				const eggText = "Thievul hid the sweets with **" + holder.name + "**!";
				this.on(eggText, () => {
					let time: number;
					if (remainingPlayerCount === 2) {
						time = 5000;
					} else {
						time = this.sampleOne(this.roundTimes);
					}

					this.currentHolder = holder;
					this.canSteal = true;
					this.setTimeout(() => {
						this.canSteal = false;
						this.takeBackSweets();
					}, time);
				});
				this.say(eggText);
			}, 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		this.convertPointsToBits();
		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<ThievulsSweetThief> = {
	steal: {
		command(target, room, user) {
			if (!this.canSteal) return false;

			const player = this.players[user.id];
			if (player === this.currentHolder) {
				player.sayPrivateHtml("You cannot steal the sweets from yourself!");
				return false;
			}

			const id = Tools.toId(target);
			if (!(id in this.players) || this.players[id].eliminated) {
				player.sayPrivateHtml("You can only steal the sweets from someone currently in the game!");
				return false;
			}

			if (this.players[id] !== this.currentHolder) {
				player.sayPrivateHtml(this.players[id].name + " does not currently have the sweets!");
				return false;
			}

			this.currentHolder = player;
			return true;
		},
		aliases: ['thief'],
	},
};

export const game: IGameFile<ThievulsSweetThief> = {
	aliases: ['thievuls', 'sweetthief'],
	category: 'reaction',
	class: ThievulsSweetThief,
	commands,
	commandDescriptions: [Config.commandCharacter + 'steal [player]'],
	description: "Players try to be the last one to steal the sweets each round!",
	name: "Thievul's Sweet Thief",
	mascot: "Thievul",
};
