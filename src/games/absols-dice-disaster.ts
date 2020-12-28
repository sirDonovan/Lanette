import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

type AbsolSense = 'disaster' | 'stillness' | 'fortune';
const senseRolls: KeyedDict<AbsolSense, number> = {
	disaster: 25,
	stillness: 50,
	fortune: 100,
};

class AbsolsDiceDisaster extends ScriptedGame {
	absolSense: AbsolSense = 'disaster';
	bestPlayer: Player | null = null;
	bestBid: number = -1;
	canBid: boolean = false;
	inactiveRoundLimit: number = 5;
	maxPlayers: number = 20;
	minBid: number = 1;
	roundDiceRoll: number = 0;
	roundTimer: number = 20 * 1000;

	onStart(): void {
		this.say("Each round, you will have " + Tools.toDurationString(this.roundTimer) + " to bid numbers between " + this.minBid +
			" and " + senseRolls.fortune + " based on Absol's senses!");
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
		const html = this.getRoundHtml(players => this.getPlayerNames(players));
		this.onUhtml(uhtmlName, html, () => {
			this.roundDiceRoll = Math.floor(Math.random() * senseRolls.fortune) + 1;
			let absolSenseText: string = "Absol senses ";
			if (this.roundDiceRoll <= senseRolls.disaster) {
				this.absolSense = 'disaster';
				absolSenseText += "an impending disaster!";
			} else if (this.roundDiceRoll <= senseRolls.stillness) {
				this.absolSense = 'stillness';
				absolSenseText += "a stillness in the air.";
			} else {
				this.absolSense = 'fortune';
				absolSenseText += "a good fortune!";
			}

			const text = absolSenseText + " Place your bids now with ``" + Config.commandCharacter + "bid``.";
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
			this.inactiveRounds++;
			if (this.inactiveRounds === this.inactiveRoundLimit) {
				this.inactivityEnd();
				return;
			}
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		} else {
			if (this.inactiveRounds) this.inactiveRounds = 0;

			const bidText = "**" + this.bestPlayer.name + "** has the highest bid of " + this.bestBid + "!";
			this.on(bidText, () => {
				this.timeout = setTimeout(() => {
					const diceText = "The dice landed on " + this.roundDiceRoll + "!";
					if (this.roundDiceRoll >= this.bestBid) {
						this.say(diceText);
						for (const i in this.players) {
							if (this.players[i] === this.bestPlayer!) continue;
							this.players[i].eliminated = true;
						}
						this.end();
						return;
					} else {
						this.say(diceText + " **" + this.bestPlayer!.name + "** has been eliminated from the game.");
						this.bestPlayer!.eliminated = true;
						this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
					}
				}, 5 * 1000);
			});
			this.say(bidText);
		}
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

const commands: GameCommandDefinitions<AbsolsDiceDisaster> = {
	bid: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canBid) return false;
			const bid = parseInt(target);
			if (isNaN(bid) || bid > senseRolls[this.absolSense] || bid < this.minBid) {
				user.say("You must bid a number between " + this.minBid + " and " + senseRolls[this.absolSense] + ".");
				return false;
			}
			if (bid > this.bestBid) {
				this.bestBid = bid;
				this.bestPlayer = this.players[user.id];
				if (bid === senseRolls[this.absolSense]) {
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
	category: 'luck',
	class: AbsolsDiceDisaster,
	commandDescriptions: [Config.commandCharacter + "bid [number]"],
	commands,
	description: "Each round, players bid numbers based on Absol's sense of disaster. Once time is up, dice will be rolled for the " +
		"player with the highest bid. If the result is greater than or equal to the bid then the player wins, otherwise the player is " +
		"eliminated!",
	additionalDescription: "<b>Absol's senses</b>:<br /><br />" +
		"<b>Disaster</b>: rolls will be between 1 and " + senseRolls.disaster + "<br />" +
		"<b>Stillness</b>: rolls will be between 1 and " + senseRolls.stillness + "<br />" +
		"<b>Fortune</b>: rolls will be between 1 and " + senseRolls.fortune + "<br />",
	name: "Absol's Dice Disaster",
	mascot: "Absol",
};
