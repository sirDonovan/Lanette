import type { PRNGSeed } from "../prng";
import type { Player } from '../room-activity';
import type { Room } from "../rooms";
import type { GameCommandDefinitions, GameCommandReturnType, IGameFile } from "../types/games";
import type { User } from "../users";
import { game as playingCardGame, PlayingCard } from './templates/playing-card';
import type { IPlayingCard } from './templates/playing-card';

class MurkrowsBlackjack extends PlayingCard {
	readonly blackJackpots = new Map<Player, number>();
	blackjackRound: number = 0;
	canHit: boolean = false;
	canLateJoin: boolean = true;
	canWager: boolean = true;
	dealersHand: number = 0;
	readonly faceCardValues = {
		J: 10,
		Q: 10,
		K: 10,
		A: 11,
	};
	readonly maxBlackjackGames: number = 5;
	readonly maxHandTotal: number = 21;
	readonly roundActions = new Set<Player>();
	readonly roundLimit: number = 20;
	subGameNumber: number = 0;
	readonly wagers = new Map<Player, number>();

	dealersTopCard!: IPlayingCard;

	readonly wagerLimit: number;

	constructor(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed) {
		super(room, pmRoom, initialSeed);

		this.wagerLimit = Math.floor((this.maxBits / this.maxBlackjackGames) / 2);
	}

	getHandInfoHtml(player: Player): string {
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

	onStart(): void {
		this.nextBlackJackGame();
	}

	onSignups(): void {
		this.say("Place your wager for each game now with ``" + Config.commandCharacter + "wager amount``!");
	}

	startBlackjackGame(): void {
		if (this.timeout) clearTimeout(this.timeout);
		this.canWager = false;
		this.subGameNumber++;
		this.blackjackRound = 0;
		if (this.subGameNumber > 1) {
			this.playerCards.clear();
			this.playerTotals.clear();
		}
		const cards = this.getCards(2);
		if (cards[0].name === 'A' && cards[1].name === 'A') cards[0].value = 1;
		this.dealersTopCard = cards[0];
		this.dealersHand = cards[0].value + cards[1].value;
		while (this.dealersHand < 17) {
			const card = this.getCard();
			cards.push(card);
			let total = 0;
			const aceCards = [];
			for (const card of cards) {
				total += card.value;
				if (card.value === 11) aceCards.push(card);
			}
			let ace = aceCards.shift();
			while (total > 21 && ace) {
				ace.value = 1;
				total -= 10;
				ace = aceCards.shift();
			}
			this.dealersHand = total;
		}
		this.canLateJoin = false;
		this.say("Dealing " + (this.subGameNumber > 1 ? "new " : "") + "cards in PMs!");
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			this.dealCards(this.players[i]);
		}
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	nextBlackJackGame(): void {
		if (this.timeout) clearTimeout(this.timeout);
		for (const i in this.players) {
			this.players[i].frozen = false;
		}
		if (!this.getRemainingPlayerCount() || this.subGameNumber >= this.maxBlackjackGames) return this.end();
		this.startBlackjackGame();
	}

	onNextRound(): void {
		this.canHit = false;
		let playersLeft: number;
		this.blackjackRound++;
		if (this.blackjackRound === 1) {
			playersLeft = this.getRemainingPlayerCount();
		} else {
			playersLeft = 0;
			const autoFreeze = this.blackjackRound > 3;
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
		if (!playersLeft || this.blackjackRound > this.roundLimit) {
			const text = "All players have finished their turns!";
			this.on(text, () => {
				this.canLateJoin = true;
				this.timeout = setTimeout(() => {
					const text = "Murkrow " + (this.dealersHand < 22 ? "has " : "bust with ") + this.dealersHand + "!";
					this.on(text, () => {
						this.timeout = setTimeout(() => this.endBlackjackGame(), 5 * 1000);
					});
					this.say(text);
				}, 5000);
			});
			this.say(text);
			return;
		}
		this.roundActions.clear();
		const html = this.getRoundHtml(this.getPlayerWins, null, "Round " + this.blackjackRound);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.canHit = true;
			this.onCommands(['hit', 'stay'], {max: this.getRemainingPlayerCount(), remainingPlayersMax: true}, () => this.nextRound());
			this.timeout = setTimeout(() => this.nextRound(), 15 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	endBlackjackGame(): void {
		if (this.timeout) clearTimeout(this.timeout);
		this.canHit = false;
		const blackjacks: Player[] = [];
		const gameWinners: string[] = [];
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const total = this.playerTotals.get(player);
			// late-joins
			if (!total) continue;
			if (total > 21) continue;
			if (total === 21) blackjacks.push(player);
			if (this.dealersHand > 21 || total >= this.dealersHand) {
				const wins = this.winners.get(player) || 0;
				this.winners.set(player, wins + 1);
				gameWinners.push(player.name);
			}
		}

		let text = '';
		if (gameWinners.length) {
			if (blackjacks.length) {
				const blackJackpot = Math.floor(300 / blackjacks.length);
				for (const blackjack of blackjacks) {
					const previousBlackJackpots = this.blackJackpots.get(blackjack) || 0;
					this.blackJackpots.set(blackjack, previousBlackJackpots + blackJackpot);
				}
			}
			text = "**Game " + this.subGameNumber + " winner" + (gameWinners.length > 1 ? "s" : "") + "**: " + gameWinners.join(", ") +
				(blackjacks.length ? " | **BlackJackpot winner" + (blackjacks.length > 1 ? "s" : "") + "**: " +
				this.getPlayerNames(blackjacks) : "");
		} else if (this.dealersHand > 21) {
			text = "No one wins Game " + this.subGameNumber + "!";
		} else {
			text = "Murkrow wins Game " + this.subGameNumber + "!";
		}

		this.on(text, () => {
			this.timeout = setTimeout(() => this.nextBlackJackGame(), 5 * 1000);
		});
		this.say(text);
	}

	onEnd(): void {
		this.winners.forEach((wins, user) => {
			const wager = this.wagers.get(user);
			let bits = (wager ? (wager * 2) : 100);
			bits *= wins;
			if (bits < 100) {
				bits = 100;
			}
			const blackJackpots = this.blackJackpots.get(user);
			if (blackJackpots) bits += blackJackpots;
			this.addBits(user, bits);
		});

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<MurkrowsBlackjack> = {
	hit: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canHit || this.players[user.id].frozen) return false;
			const player = this.players[user.id];
			if (this.roundActions.has(player)) return false;
			const userCards = this.playerCards.get(player)!;
			const card = this.getCard();
			userCards.push(card);
			let total = 0;
			const aceCards = [];
			for (const card of userCards) {
				total += card.value;
				if (card.value === 11) aceCards.push(card);
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
			this.roundActions.add(player);
			return true;
		},
		pmGameCommand: true,
	},
	stay: {
		command(target, room, user): GameCommandReturnType {
			if (!this.started || this.players[user.id].frozen) return false;
			const player = this.players[user.id];
			if (this.roundActions.has(player)) return false;
			player.frozen = true;
			this.dealCards(player);
			if (this.playerTotals.get(player) === 21) {
				const cards = this.playerCards.get(player)!;
				/*
				if ((cards[0].name === 'J' || cards[1].name === 'J') && (cards[0].name === 'A' || cards[1].name === 'A')) {
					Games.unlockAchievement(this.room, user, "True Blackjack", this);
				}
				*/
			}
			this.roundActions.add(player);
			return true;
		},
		pmGameCommand: true,
	},
	wager: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canWager) {
				user.say("You must place your wager before the game starts.");
				return false;
			}
			const player = this.players[user.id];
			const database = Storage.getDatabase(this.room as Room);
			if (!database.leaderboard || !(user.id in database.leaderboard)) return false;
			const bits = database.leaderboard[user.id].current;
			if (!bits) {
				user.say("You do not have any bits to wager!");
				return false;
			}
			let wager = parseInt(target.trim().split(" ")[0]);
			if (wager <= 0 || isNaN(wager)) return false;
			if (this.wagerLimit && wager > this.wagerLimit) wager = this.wagerLimit;
			if (wager > bits) {
				user.say("You cannot wager more bits than you currently have!");
				return false;
			}
			wager = Math.floor(wager);
			this.wagers.set(player, wager);
			user.say("Your wager for " + wager + " bits has been placed!");
			return true;
		},
		signupsGameCommand: true,
	},
};

export const game: IGameFile<MurkrowsBlackjack> = Games.copyTemplateProperties(playingCardGame, {
	aliases: ["murkrows", "bj", "mb"],
	commandDescriptions: [Config.commandCharacter + "hit", Config.commandCharacter + "stay"],
	commands: Object.assign(Tools.deepClone(playingCardGame.commands), commands),
	class: MurkrowsBlackjack,
	description: "Players wager to beat Murkrow's hand without going over 21!",
	formerNames: ["Blackjack"],
	name: "Murkrow's Blackjack",
	mascot: "Murkrow",
	scriptedOnly: true,
});
