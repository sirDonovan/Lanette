import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

class ChatotsMusicalChairs extends ScriptedGame {
	roundActions = new Map<Player, number>();
	roundChairs: number = 0;
	roundTimes: number[] = [5000, 5500, 6000, 6500, 7000];

	onStart(): void {
		this.nextRound();
	}

	stopMusic(): void {
		if (this.getRemainingPlayerCount() < 2) return this.end();

		for (const i in this.players) {
			if (this.players[i].eliminated) continue;

			const player = this.players[i];
			if (!this.roundActions.has(player)) {
				player.sayPrivateHtml("You did not sit in a chair in time!");
				this.eliminatePlayer(player);
			}
		}

		this.nextRound();
	}

	onNextRound(): void {
		this.roundChairs = 0;

		const len = this.getRemainingPlayerCount();
		if (len <= 1) {
			this.end();
			return;
		}

		this.roundActions.clear();

		const html = this.getRoundHtml(players => this.getPlayerNames(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			const roundChairs = this.getRemainingPlayerCount() - 1;
			const startText = "The music has started! There " + (roundChairs === 1 ? "is **1 chair**" :
				"are **" + roundChairs + " chairs**") + " remaining.";
			this.on(startText, () => {
				this.setTimeout(() => {
					const stopText = "**The music stopped!**";
					this.on(stopText, () => {
						this.roundChairs = roundChairs;
					});
					this.say(stopText);

					this.setTimeout(() => this.stopMusic(), 5 * 1000);
				}, this.sampleOne(this.roundTimes));
			});

			this.setTimeout(() => this.say(startText), 5 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		const winner = this.getFinalPlayer();
		if (winner) {
			this.winners.set(winner, 1);
			this.addBits(winner, 500);
		}

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.roundActions.clear();
	}
}

const commands: GameCommandDefinitions<ChatotsMusicalChairs> = {
	sit: {
		command(target, room, user) {
			if (!this.roundChairs || this.roundActions.has(this.players[user.id])) return false;
			const player = this.players[user.id];
			if (this.roundActions.size === this.roundChairs) {
				player.sayPrivateHtml("All of the chairs are already taken!");
				return false;
			}

			const chair = parseInt(target);
			if (isNaN(chair) || chair < 1 || chair > this.roundChairs) {
				player.sayPrivateHtml("You can only sit in " + (this.roundChairs === 1 ? "chair #1" : " the chairs #1 through #" +
					this.roundChairs) + "!");
				return false;
			}

			let takenChair = false;
			this.roundActions.forEach(playerChair => {
				if (playerChair === chair) takenChair = true;
			});

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (takenChair) {
				player.sayPrivateHtml("The chair #" + chair + " is already taken!");
				return false;
			}

			this.roundActions.set(player, chair);
			return true;
		},
	},
};

export const game: IGameFile<ChatotsMusicalChairs> = {
	aliases: ["chatots", "cmc", "musicalchairs"],
	category: 'reaction',
	challengeSettings: {
		onevsone: {
			enabled: true,
		},
	},
	commandDescriptions: [Config.commandCharacter + "sit [chair]"],
	commands,
	class: ChatotsMusicalChairs,
	description: "Players try to be the first to sit in an open chair each round when the music stops!",
	name: "Chatot's Musical Chairs",
	mascot: "Chatot",
};
