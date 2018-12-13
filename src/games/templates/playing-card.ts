import { ICommandDefinition } from '../../command-parser';
import {Game, Player} from '../../room-game';
import {Room} from '../../rooms';

export type IPlayingCardSuits = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export interface IPlayingCard {
	name: string;
	suit: IPlayingCardSuits;
	value: number;
}

const suitCodes = {
	'clubs': '&clubs;',
	'diamonds': '&diams;',
	'hearts': '&hearts;',
	'spades': '&spades;',
};

class PlayingCardGame extends Game {
	playerCards: Map<Player, IPlayingCard[]>;
	wagers: Map<Player, number> | null;
	playerTotals: Map<Player, number>;
	deck: IPlayingCard[];
	faceCardValues: {J: number, Q: number, K: number, A: number};
	maxHandTotal: number;
	startingHandAmount: number;
	cardHtmlDelimiter: string;

	constructor(room: Room) {
		super(room);
		this.playerCards = new Map();
		this.wagers = null;
		this.playerTotals = new Map();
		this.deck = [];
		this.faceCardValues = {
			J: 11,
			Q: 12,
			K: 13,
			A: 14,
		};
		this.startingHandAmount = 2;
		this.maxHandTotal = 0;
		this.cardHtmlDelimiter = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
	}

	createDeck() {
		const deck: IPlayingCard[] = [];
		const suits: IPlayingCardSuits[] = ['clubs', 'diamonds', 'hearts', 'spades'];
		for (let i = 1; i <= 13; i++) {
			let card: IPlayingCard;
			if (i === 1) {
				card = {name: "A", suit: suits[0], value: this.faceCardValues["A"]};
			} else if (i === 11) {
				card = {name: "J", suit: suits[0], value: this.faceCardValues["J"]};
			} else if (i === 12) {
				card = {name: "Q", suit: suits[0], value: this.faceCardValues["Q"]};
			} else if (i === 13) {
				card = {name: "K", suit: suits[0], value: this.faceCardValues["K"]};
			} else {
				card = {name: '' + i, suit: suits[0], value: i};
			}
			deck.push(card);
			for (let i = 1; i < suits.length; i++) {
				deck.push(Object.assign({}, card, {suit: suits[i]}));
			}
		}
		this.deck = Tools.shuffle(deck);
		return this.deck;
	}

	getCard(): IPlayingCard {
		if (!this.deck.length) this.createDeck();
		const card = this.deck[0];
		this.deck.shift();
		return card;
	}

	getCards(amount: number): IPlayingCard[] {
		const cards: IPlayingCard[] = [];
		for (let i = 0; i < amount; i++) {
			cards.push(this.getCard());
		}
		return cards;
	}

	getCardHtml(card: IPlayingCard, inChat?: boolean): string {
		const redSuit = card.suit === 'diamonds' || card.suit === 'hearts';
		let html = '<div class="infobox" style="display:inline-block;height:65px;width:50px;"><div style="text-align: right">';
		if (redSuit) html += '<font style="color:red">';
		html += suitCodes[card.suit];
		if (redSuit) html += '</font>';
		html += '</div>' + card.name + '<br /><div style="text-align: left">';
		if (redSuit) html += '<font style="color:red">';
		html += suitCodes[card.suit];
		if (redSuit) html += '</font>';
		html += '</div></div>';
		return html;
	}

	dealCards(player: Player, newCards?: IPlayingCard[]) {
		let cards = this.playerCards.get(player);
		if (!cards) {
			if (this.wagers) {
				const wager = this.wagers.get(player);
				// if (wager) Storage.subtractPoints(player.name, wager, this.room.id);
			}
			cards = this.getCards(this.startingHandAmount);
			let total = 0;
			const aces: IPlayingCard[] = [];
			for (let i = 0; i < cards.length; i++) {
				total += cards[i].value;
				if (cards[i].name === 'A') aces.push(cards[i]);
			}
			while (this.maxHandTotal && total > this.maxHandTotal && aces.length) {
				const ace = aces[0];
				aces.shift();
				ace.value = 1;
				total -= this.faceCardValues['A'] - 1;
			}
			this.playerCards.set(player, cards);
			this.playerTotals.set(player, total);
		}
		let html = '<div class="infobox"><center>';
		if (newCards) {
			html += '<b>New card' + (newCards.length > 1 ? 's' : '') + '</b>:<br /><font size="4">';
			const newCardsHtml: string[] = [];
			for (let i = 0; i < newCards.length; i++) {
				newCardsHtml.push(this.getCardHtml(newCards[i]));
			}
			html += newCardsHtml.join(this.cardHtmlDelimiter) + '</font><br /><br />';
		}
		if (this.round === 0) {
			html += '<b>You have been dealt</b>:';
		} else {
			html += '<b>Your hand</b>:';
		}

		html += '<br /><font size="4">';
		const cardsHtml: string[] = [];
		for (let i = 0; i < cards.length; i++) {
			cardsHtml.push(this.getCardHtml(cards[i]));
		}

		html += cardsHtml.join(this.cardHtmlDelimiter) + '</font>';

		if (this.getHandInfoHtml) {
			const handInfo = this.getHandInfoHtml(player);
			if (handInfo) html += '<br /><br /><div class="infobox">' + handInfo + '</div>';
		}

		html += '</center></div>';
		player.sayUhtml(html, "hand");
	}

	getPlayerSummary(player: Player) {
		if (player.eliminated) return;
		const userCards = this.playerCards.get(player);
		if (!userCards || !userCards.length) return player.say("You don't have any cards yet");
		this.dealCards(player);
	}

	getHandInfoHtml?(player: Player): string;
}

export let commands: Dict<ICommandDefinition<PlayingCardGame>> = {
	cards: Games.commands.summary,
	hand: Games.commands.summary,
};

export let game = PlayingCardGame;
export let disabled = false;
