import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

const minGuess = 1;
const maxGuess = 6;
const basePoints = 10;

class FalinksFormations extends ScriptedGame {
	points = new Map<Player, number>();
	playerList: Player[] = [];
	currentPlayer: Player | null = null;
	canGuess: boolean = false;
	formationsRound: number = 0;

	onRemovePlayer(player: Player): void {
		if (this.currentPlayer === player) this.nextRound();
	}

	onStart(): void {
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onNextRound(): void {
		if (this.currentPlayer) {
			this.say(this.currentPlayer.name + " did not guess a number and has been eliminated from the game!");
			this.eliminatePlayer(this.currentPlayer, "You did not guess a number!");
			this.currentPlayer = null;
		}

		if (!this.playerList.length || !this.getRemainingPlayerCount(this.playerList)) {
			if (this.getRemainingPlayerCount() < 2) {
				this.end();
				return;
			}

			this.formationsRound++;
			this.sayUhtml(this.uhtmlBaseName + '-round-html',
				this.getRoundHtml(this.getPlayerPoints, null, "Round " + this.formationsRound));
			this.playerList = this.shufflePlayers();
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			return;
		}

		const currentPlayer = this.playerList[0];
		this.playerList.shift();
		if (currentPlayer.eliminated) return this.nextRound();

		const text = "**" + currentPlayer.name + "** it is your turn to guess!";
		this.on(text, () => {
			this.canGuess = true;
			this.currentPlayer = currentPlayer;
			this.timeout = setTimeout(() => this.nextRound(), 30 * 1000);
		});
		this.say(text);
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			this.winners.set(this.players[i], 1);
			this.addBits(this.players[i], 500);
		}

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<FalinksFormations> = {
	guess: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canGuess || this.players[user.id] !== this.currentPlayer) return false;
			const player = this.players[user.id];
			const guess = parseInt(target);
			if (isNaN(guess) || guess < minGuess || guess > maxGuess) {
				this.say("You must guess a number between " + minGuess + " and " + maxGuess + ".");
				return false;
			}

			if (this.timeout) clearTimeout(this.timeout);
			this.canGuess = false;
			const falinks = this.random(maxGuess + 1) + 1;
			const falinksText = "**" + falinks + " Falinks** appeared for the formation!";
			if (falinks <= guess) {
				this.say("Only " + falinksText + " " + this.currentPlayer.name + " has been eliminated from the game.");
				this.eliminatePlayer(player, "You did not guess enough Falinks!");
				this.currentPlayer = null;
				this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			} else {
				const points = this.addPoints(player, guess);
				if (points >= this.format.options.points) {
					this.say(falinksText + " " + this.currentPlayer.name + " has reached the score cap!");
					for (const i in this.players) {
						if (this.players[i] !== player) this.players[i].eliminated = true;
					}
					this.end();
				} else {
					this.say(falinksText + " " + this.currentPlayer.name + " advances to **" + points + "** point" +
						(points > 1 ? "s" : "") + ".");
					this.points.set(this.currentPlayer, points);
					this.currentPlayer = null;
					this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
				}
			}

			return true;
		},
		aliases: ['g'],
	},
};

export const game: IGameFile<FalinksFormations> = {
	aliases: ["falinks", "formations"],
	category: 'luck',
	commandDescriptions: [Config.commandCharacter + "guess [number]"],
	commands,
	class: FalinksFormations,
	customizableOptions: {
		points: {min: basePoints, base: basePoints, max: basePoints},
	},
	description: "Players guess how many Falinks will make up the formations each round (between " + minGuess + " and " + maxGuess + ") " +
		"without going over!",
	name: "Falinks' Formations",
	mascot: "Falinks",
};