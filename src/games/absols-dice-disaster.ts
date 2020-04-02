import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { IGameFile, GameCommandReturnType } from "../types/games";

class AbsolsDiceDisaster extends Game {
	bestPlayer: Player | null = null;
	bestBid: number = -1;
	canBid: boolean = false;
	maxBid: number = 100;
	maxPlayers: number = 20;
	minBid: number = 1;
	roundDiceRoll: number = 0;
	roundTimer: number = 20 * 1000;

	onStart(): void {
		this.say("Each round, you will have " + Tools.toDurationString(this.roundTimer) + " to bid numbers between " + this.minBid + " and " + this.maxBid + " based on Absol's senses!");
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onNextRound(): void {
		if (this.getRemainingPlayerCount() <= 1) {
			this.end();
			return;
		}

		this.bestPlayer = null;
		this.bestBid = -1;
		const uhtmlName = this.uhtmlBaseName + '-round';
		const html = this.getRoundHtml(this.getPlayerNames);
		this.onUhtml(uhtmlName, html, () => {
			this.roundDiceRoll = Math.floor(Math.random() * this.maxBid) + 1;
			let absolSense: string = "Absol senses ";
			if (this.roundDiceRoll <= 25) {
				absolSense += "an impending disaster!";
			} else if (this.roundDiceRoll <= 75) {
				absolSense += "a stillness in the air.";
			} else {
				absolSense += "a good fortune!";
			}

			const text = absolSense + " Place your bids now with ``" + Config.commandCharacter + "bid``.";
			this.on(text, () => {
				this.canBid = true;
				this.timeout = setTimeout(() => this.endBidding(), this.roundTimer);
			});
			this.timeout = setTimeout(() => this.say(text), 5 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	endBidding(): void {
		this.canBid = false;
		if (!this.bestPlayer) {
			this.say("There were no bids!");
			this.end();
			return;
		}

		const text = "**" + this.bestPlayer.name + "** has the highest bid of " + this.bestBid + "!";
		this.on(text, () => {
			this.timeout = setTimeout(() => {
				const text = "The dice landed on " + this.roundDiceRoll + "!";
				if (this.roundDiceRoll >= this.bestBid) {
					this.say(text);
					for (const i in this.players) {
						if (this.players[i] === this.bestPlayer!) continue;
						this.players[i].eliminated = true;
					}
					this.end();
					return;
				} else {
					this.say(text + " **" + this.bestPlayer!.name + "** has been eliminated from the game.");
					this.bestPlayer!.eliminated = true;
					this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
				}
			}, 5 * 1000);
		});
		this.say(text);
	}

	onEnd(): void {
		const winner = this.getFinalPlayer();
		if (winner) {
			this.winners.set(winner, 1);
			this.addBits(winner, 500);
		}
		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<AbsolsDiceDisaster>> = {
	bid: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canBid || !(user.id in this.players) || this.players[user.id].eliminated) return false;
			const bid = parseInt(target);
			if (isNaN(bid) || bid > this.maxBid || bid < this.minBid) {
				user.say("You must bid a number between " + this.minBid + " and " + this.maxBid + ".");
				return false;
			}
			if (bid > this.bestBid) {
				this.bestBid = bid;
				this.bestPlayer = this.players[user.id];
				if (bid === this.maxBid) {
					if (this.timeout) clearTimeout(this.timeout);
					this.endBidding();
				}
			}
			return true;
		},
	},
};

export const game: IGameFile<AbsolsDiceDisaster> = {
	aliases: ['absols', 'dicedisaster', 'ddice', 'dd'],
	class: AbsolsDiceDisaster,
	commandDescriptions: [Config.commandCharacter + "bid [number]"],
	commands,
	description: "Each round, players bid numbers based on Absol's sense of disaster. Once time is up, dice will be rolled for the player with the highest bid. If the result is greater than or equal to the bid then the player wins, otherwise the player is eliminated!",
	name: "Absol's Dice Disaster",
	mascot: "Absol",
};
