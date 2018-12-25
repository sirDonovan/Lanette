import { ICommandDefinition } from "../command-parser";
import { IGameFile } from "../games";
import { Player } from '../room-activity';
import { Room } from "../rooms";
import {commands as templateCommands, game as PlayingCardGame, IPlayingCard} from './templates/playing-card';

class MurkrowsBlackjack extends PlayingCardGame {
	roundActions = new Set<Player>();
	roundLimit = 20;
	wagers = new Map<Player, number>();
	wagerTime = false;
	wagerLimit = 300;
	canHit = false;
	dealersHand = 0;
	blackjackGame = 0;
	maxBlackjackGames = 5;
	maxHandTotal = 21;
	blackJackpots = new Map<Player, number>();
	faceCardValues = {
		J: 10,
		Q: 10,
		K: 10,
		A: 11,
	};

	dealersTopCard!: IPlayingCard;

	constructor(room: Room) {
		super(room);
	}

	getHandInfoHtml(player: Player) {
		let info = '';
		const total = this.playerTotals.get(player)!;
		if (total > 21) {
			info += '<b>You bust with ' + total + '!</b>';
		} else if (player.frozen) {
			info += '<b>Final total</b>: ' + total + '<br />Stay tuned for the reveal of Murkrow\'s hand!';
		} else {
			info += '<b>Total</b>: ' + total + '<br />Murkrow\'s top card: [ ' + this.dealersTopCard.name + ' ]';
		}
		return info;
	}

	onStart() {
		this.nextBlackJackGame();
	}

	startBlackjackGame() {
		if (this.timeout) clearTimeout(this.timeout);
		this.blackjackGame++;
		this.round = 0;
		if (this.blackjackGame > 1) {
			this.playerCards.clear();
			this.playerTotals.clear();
		}
		this.wagerTime = false;
		const cards = this.getCards(2);
		if (cards[0].name === 'A' && cards[1].name === 'A') cards[0].value = 1;
		this.dealersTopCard = cards[0];
		this.dealersHand = cards[0].value + cards[1].value;
		while (this.dealersHand < 17) {
			const card = this.getCard();
			cards.push(card);
			let total = 0;
			const aceCards = [];
			for (let i = 0, cardLen = cards.length; i < cardLen; i++) {
				total += cards[i].value;
				if (cards[i].value === 11) aceCards.push(cards[i]);
			}
			let ace = aceCards.shift();
			while (total > 21 && ace) {
				ace.value = 1;
				total -= 10;
				ace = aceCards.shift();
			}
			this.dealersHand = total;
		}
		this.say("Dealing " + (this.blackjackGame > 1 ? "new " : "") + "cards in PMs!");
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			this.dealCards(this.players[i]);
		}
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	nextBlackJackGame() {
		if (this.timeout) clearTimeout(this.timeout);
		for (const i in this.players) {
			this.players[i].frozen = false;
		}
		if (!this.getRemainingPlayerCount() || this.blackjackGame >= this.maxBlackjackGames) return this.end();
		this.startBlackjackGame();
	}

	onNextRound() {
		this.canHit = false;
		let playersLeft: number;
		if (this.round === 1) {
			playersLeft = this.getRemainingPlayerCount();
		} else {
			playersLeft = 0;
			const autoFreeze = this.round > 3;
			for (const i in this.getRemainingPlayers()) {
				const player = this.players[i];
				const playerCards = this.playerCards.get(player);
				if (!playerCards || (autoFreeze && playerCards.length === 2)) {
					player.frozen = true;
					continue;
				}
				playersLeft++;
			}
		}
		if (!playersLeft || this.round > this.roundLimit) {
			this.say("All players have finished their turns!");
			this.timeout = setTimeout(() => {
				this.say("Murkrow " + (this.dealersHand < 22 ? "has " : "bust with ") + this.dealersHand + "!");
				this.timeout = setTimeout(() => this.endBlackjackGame(), 5 * 1000);
			}, 5000);
			return;
		}
		this.roundActions.clear();
		const text = "``[Game " + this.blackjackGame + "]`` **Round " + this.round + "**! | Remaining players: " + this.getPlayerNames();
		this.on(text, () => {
			this.canHit = true;
			this.timeout = setTimeout(() => this.nextRound(), 15 * 1000);
		});
		this.say(text);
	}

	endBlackjackGame() {
		if (this.timeout) clearTimeout(this.timeout);
		this.canHit = false;
		const blackjacks: Player[] = [];
		const gameWinners: string[] = [];
		for (const i in this.players) {
			const player = this.players[i];
			if (player.eliminated) continue;
			const total = this.playerTotals.get(player) || 0;
			if (total > 21) continue;
			if (total === 21) blackjacks.push(player);
			if (this.dealersHand > 21 || total >= this.dealersHand) {
				const wins = this.winners.get(player) || 0;
				this.winners.set(player, wins + 1);
				gameWinners.push(player.name);
			}
		}
		if (gameWinners.length) {
			if (blackjacks.length) {
				const blackJackpot = Math.floor(300 / blackjacks.length);
				for (let i = 0; i < blackjacks.length; i++) {
					const previousBlackJackpots = this.blackJackpots.get(blackjacks[i]) || 0;
					this.blackJackpots.set(blackjacks[i], previousBlackJackpots + blackJackpot);
				}
			}
			this.say("**Game " + this.blackjackGame + " winner" + (gameWinners.length > 1 ? "s" : "") + "**: " + gameWinners.join(", ") + (blackjacks.length ? " | **BlackJackpot winner" + (blackjacks.length > 1 ? "s" : "") + "**: " + this.getPlayerNames(blackjacks) : ""));
		} else if (this.dealersHand > 21) {
			this.say("No one wins Game " + this.blackjackGame + "!");
		} else {
			this.say("Murkrow wins Game " + this.blackjackGame + "!");
		}

		this.timeout = setTimeout(() => this.nextBlackJackGame(), 5 * 1000);
	}

	onEnd() {
		if (this.winners.size) {
			this.say("**Winner" + (this.winners.size > 1 ? "s" : "") + "**: " + this.getPlayerNames(this.winners));
			this.winners.forEach((wins, user) => {
				const wager = this.wagers.get(user);
				let earnings = (wager ? (wager * 2) : 100);
				earnings *= wins;
				if (earnings > 1000) {
					earnings = 1000;
				} else if (earnings < 100) {
					earnings = 100;
				}
				const blackJackpots = this.blackJackpots.get(user);
				if (blackJackpots) earnings += blackJackpots;
				// this.addBits(earnings, user);
			});
		} else if (this.dealersHand > 21) {
			this.say("No winners this " + (this.parentGame ? "round" : "game") + "!");
		} else {
			this.say("Murkrow wins the " + (this.parentGame ? "round" : "game") + "!");
		}
	}
}

const commands: Dict<ICommandDefinition<MurkrowsBlackjack>> = {
	hit: {
		command(target, room, user) {
			if (!this.canHit || !(user.id in this.players) || this.players[user.id].eliminated || this.players[user.id].frozen) return;
			const player = this.players[user.id];
			if (this.roundActions.has(player)) return;
			this.roundActions.add(player);
			const userCards = this.playerCards.get(player)!;
			const card = this.getCard();
			userCards.push(card);
			let total = 0;
			const aceCards = [];
			for (let i = 0, len = userCards.length; i < len; i++) {
				total += userCards[i].value;
				if (userCards[i].value === 11) aceCards.push(userCards[i]);
			}
			let ace = aceCards.shift();
			while (total > 21 && ace) {
				ace.value = 1;
				total -= 10;
				ace = aceCards.shift();
			}
			if (total > 21) this.players[user.id].frozen = true;
			this.playerTotals.set(player, total);
			this.dealCards(player, [card]);
			// if (total >= 29) Games.unlockAchievement(this.room, user, "Overkill", this);
		},
		pmGameCommand: true,
	},
	stay: {
		command(target, room, user) {
			if (!this.started || !(user.id in this.players) || this.players[user.id].eliminated || this.players[user.id].frozen) return;
			const player = this.players[user.id];
			player.frozen = true;
			this.dealCards(player);
			if (this.playerTotals.get(player) === 21) {
				const cards = this.playerCards.get(player)!;
				// if ((cards[0].name === 'J' || cards[1].name === 'J') && (cards[0].name === 'A' || cards[1].name === 'A')) Games.unlockAchievement(this.room, user, "True Blackjack", this);
			}
			this.roundActions.add(player);
		},
		pmGameCommand: true,
	},
};

export const game: IGameFile<MurkrowsBlackjack> = {
	class: MurkrowsBlackjack,
	description: "Players wager to beat Murkrow's hand without going over 21!",
	name: "Murkrow's Blackjack",
	aliases: ["blackjack", "murkrows", "bj"],
	commands: Object.assign({}, templateCommands, commands),
};
