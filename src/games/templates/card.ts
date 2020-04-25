import { ICommandDefinition } from '../../command-parser';
import { Player } from '../../room-activity';
import { Game } from '../../room-game';
import { IGameTemplateFile } from '../../types/games';
import { IMoveCopy, IPokemon, IPokemonCopy } from '../../types/dex';

export interface IActionCardData {
	readonly description: string;
	readonly name: string;
	readonly requiredOtherCards?: number;
	readonly requiredTarget?: boolean;
}

export interface IMoveCard extends IMoveCopy {
	action?: IActionCardData | null;
	availability?: number;
	displayName?: string;
	played?: boolean;
}

export interface IPokemonCard extends IPokemonCopy {
	action?: IActionCardData | null;
	displayName?: string;
	played?: boolean;
}

export type CardType = IMoveCard | IPokemonCard;

export abstract class Card extends Game {
	actionCardAmount: number = 0;
	actionCards: Dict<IActionCardData> = {};
	autoFillHands: boolean = false;
	canLateJoin: boolean = true;
	cardRound: number = 0;
	categoriesNames: Dict<string> = {};
	colors: Dict<string> = {};
	colorsLimit: number = 0;
	currentPlayer: Player | null = null;
	deck: CardType[] = [];
	deckPool: CardType[] = [];
	detailCategories: string[] = [];
	detailLabelWidth: number = 75;
	drawAmount: number = 1;
	finitePlayerCards: boolean = false;
	inactivePlayerCounts = new Map<Player, number>();
	inactivePlayerLimit: number = 0;
	maxCardRounds: number = 0;
	maxPlayers: number = 20;
	minimumPlayedCards: number = 1;
	playableCardDescription: string = '';
	playerCards = new Map<Player, CardType[]>();
	playerList: Player[] = [];
	playerOrder: Player[] = [];
	roundTime: number = 30 * 1000;
	showPlayerCards: boolean = false;
	timeEnded: boolean = false;
	timeLimit: number = 25 * 60 * 1000;
	typesLimit: number = 0;
	usesColors: boolean = false;
	// usesLateJoinQueue: boolean = false;
	usesMoves: boolean = false;

	// always truthy once the game starts
	topCard!: CardType;

	abstract createDeck(): void;
	abstract getCardChatDetails(card: CardType): string;
	abstract getCardsPmHtml(cards: CardType[], player: Player): string;
	abstract onNextRound(): void;
	abstract onStart(): void;

	isMoveBased(card: CardType): card is IMoveCard {
		return this.usesMoves;
	}

	createDeckPool(): void {
		this.deckPool = [];
		const pokemonList = Games.getPokemonCopyList(pokemon => {
			if (pokemon.forme || pokemon.id in this.actionCards || !Dex.hasGifData(pokemon) || (this.filterPoolItem && this.filterPoolItem(pokemon))) return false;
			return true;
		});
		for (const pokemon of pokemonList) {
			const color = Tools.toId(pokemon.color);
			if (!(color in this.colors)) this.colors[color] = pokemon.color;
			this.deckPool.push(pokemon);
		}
	}

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (lateJoin) {
			const cards = this.dealHand(player);
			this.playerCards.set(player, cards);
			this.playerOrder.push(player);
			this.playerList.push(player);
		}
		return true;
	}

	getCard(): CardType {
		let card = this.deck.shift();
		if (!card) {
			this.say("Shuffling the deck!");
			this.createDeck();
			card = this.deck[0];
			this.deck.shift();
		}
		return card;
	}

	getCardIndex(name: string, cards: CardType[]): number {
		const id = Tools.toId(name);
		let index = -1;
		for (let i = 0; i < cards.length; i++) {
			if (cards[i].id === id) {
				index = i;
				break;
			}
		}
		return index;
	}

	getChatTypeLabel(card: IPokemonCard): string {
		const types = [];
		for (const type of card.types) {
			const colorData = Tools.hexColorCodes[Tools.typeHexColors[type]];
			types.push('<div style="display:inline-block;background-color:' + colorData['background-color'] + ';background:' + colorData['background'] + ';border-color:' +
				colorData['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:' + this.detailLabelWidth + 'px;padding:1px;color:#fff;' +
				'text-shadow:1px 1px 1px #333;text-transform: uppercase;font-size:8pt;text-align:center"><b>' + type + '</b></div>'
			);
		}
		return types.join("&nbsp;/&nbsp;");
	}

	getChatColorLabel(card: IPokemonCard): string {
		const colorData = Tools.hexColorCodes[Tools.pokemonColorHexColors[card.color]];
		return '<div style="display:inline-block;background-color:' + colorData['background-color'] + ';background:' + colorData['background'] + ';border-color:' +
			colorData['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:' + this.detailLabelWidth + 'px;padding:1px;color:#fff;' +
			'text-shadow:1px 1px 1px #333;text-transform: uppercase;font-size:8pt;text-align:center"><b>' + card.color + '</b></div>';
	}

	getCardChatHtml(cards: CardType | CardType[]): string {
		if (!Array.isArray(cards)) cards = [cards];
		let html = '';
		let width = 0;
		const names: string[] = [];
		const images: string[] = [];
		let info = '';
		for (const card of cards) {
			let image = '';
			if (this.isMoveBased(card)) {
				names.push(card.name);
				const colorData = Tools.hexColorCodes[Tools.typeHexColors[card.type]];
				image = '<div style="display:inline-block;height:51px;width:' + (this.detailLabelWidth + 10) + '"><br /><div style="display:inline-block;background-color:' +
					colorData['background-color'] + ';background:' + colorData['background'] + ';border-color:' + colorData['border-color'] + ';border: 1px solid #a99890;' +
					'border-radius:3px;width:' + this.detailLabelWidth + 'px;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;font-size:8pt"><b>' +
					card.type + '</b></div></div>';
				width += this.detailLabelWidth;
			} else {
				names.push(card.name + (card.shiny ? ' \u2605' : ''));
				image = Dex.getPokemonGif(card);
				width += Dex.data.gifData[card.id]!.front!.w;
			}

			images.push(image);
			if (!info) info = this.getCardChatDetails(card);
		}
		width *= 1.5;
		if (width < 250) width = 250;
		html += '<div class="infobox" style="display:inline-block;width:' + (width + 10) + 'px;"><div class="infobox" style="width:' + width + 'px">' + names.join(", ") + '</div>';
		html += images.join("") + '<div class="infobox" style="width:' + width + 'px;">' + info + '</div></div>';
		return html;
	}

	drawCard(player: Player, amount?: number | null, cards?: CardType[] | null, dontShow?: boolean): CardType[] {
		if (!amount) {
			amount = this.drawAmount;
			if (this.topCard.action && this.topCard.action.name.startsWith('Draw')) {
				amount += parseInt(this.topCard.action.name.split('Draw ')[1].trim());
				this.topCard.action = null;
			}
		}
		if (!cards) {
			cards = [];
			for (let i = 0; i < amount; i++) {
				cards.push(this.getCard());
			}
		}
		if (dontShow) {
			const playerCards = this.playerCards.get(player)!;
			for (const card of cards) {
				playerCards.push(card);
			}
		} else {
			this.dealHand(player, cards, 'drawn');
		}
		return cards;
	}

	dealHand(player: Player, highlightedCards?: CardType[], action?: 'drawn' | 'autodrawn' | 'played'): CardType[] {
		let playerCards = this.playerCards.get(player);
		let handHtml = '';
		let pmHeader = '';
		if (playerCards) {
			if (!playerCards.length) {
				handHtml = "You do not have any cards.";
			}
		} else {
			playerCards = [];
			for (let i = 0; i < this.format.options.cards; i++) {
				const card = this.getCard();
				playerCards.push(card);
			}
			pmHeader = "<b>Here is your hand</b>:";
		}

		let shownPlayerCards: CardType[] = [];
		if (highlightedCards && action === 'autodrawn') {
			for (const card of playerCards) {
				if (!highlightedCards.includes(card)) shownPlayerCards.push(card);
			}
		} else {
			shownPlayerCards = playerCards;
		}
		if (!handHtml) handHtml = this.getCardsPmHtml(shownPlayerCards, player);

		let remainingCards = playerCards.length;
		if (highlightedCards) {
			if (action === 'drawn') remainingCards += highlightedCards.length;
		}
		if (!pmHeader && this.finitePlayerCards) {
			pmHeader = '<b>' + remainingCards + ' card' + (remainingCards > 1 ? 's' : '') + ' remaining</b>:';
		}

		let highlightedCardsHtml = '';
		if (highlightedCards) {
			highlightedCardsHtml += '<br />';
			if (action === 'drawn') {
				highlightedCardsHtml += "<u><b>Newest card" + (highlightedCards.length > 1 ? "s" : "") + "</b></u>:<br />";

				// add to player's hand after generating playerCards HTML
				for (const card of highlightedCards) {
					playerCards.push(card);
				}
			} else if (action === 'autodrawn') {
				highlightedCardsHtml += "<u><b>Newest card" + (highlightedCards.length > 1 ? "s" : "") + "</b></u>:<br />";
			} else if (action === 'played') {
				highlightedCardsHtml += "<u><b>Played card" + (highlightedCards.length > 1 ? "s" : "") + "</b></u>:<br />";
			}
			highlightedCardsHtml += this.getCardsPmHtml(highlightedCards, player);
		}
		// no <br /> after last card
		let html = '<div class="infobox" style="height:auto">';
		if (pmHeader) html += '<u>' + pmHeader + '</u>';
		html += handHtml;
		if (highlightedCardsHtml) html += highlightedCardsHtml;
		html += "</div>";
		player.sayUhtml(html, 'hand');
		return playerCards;
	}

	getNextPlayer(): Player | null {
		let player = this.playerList.shift();
		while (!player || player.eliminated) {
			if (!this.playerList.length) {
				this.playerList = this.playerOrder.slice();
				this.cardRound++;
				if (this.id === 'axewsbattlecards' && this.canLateJoin && this.cardRound > 1) this.canLateJoin = false;
				if (this.parentGame && this.maxCardRounds && this.cardRound > this.maxCardRounds) {
					this.timeEnd();
					return null;
				}
				const html = this.getRoundHtml(this.showPlayerCards ? this.getPlayerCards : this.getPlayerNames, this.getRemainingPlayers(this.playerOrder),
					"Round " + this.cardRound);
				this.sayUhtml(this.uhtmlBaseName + '-round-html', html);
			}
			player = this.playerList.shift();
		}
		return player;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getPlayerCards(players?: Dict<Player> | Player[] | Map<Player, any>): string {
		return this.getPlayerAttributes(player => {
			const cards = this.playerCards.get(player);
			return player.name + (cards ? " (" + cards.length + ")" : "");
		}, players).join(', ');
	}

	timeEnd(): void {
		this.timeEnded = true;
		this.say("Time is up!");
		const winners = new Map();
		let leastCards = Infinity;
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const cards = this.playerCards.get(player)!;
			const len = cards.length;
			if (len < leastCards) {
				winners.clear();
				winners.set(player, 1);
				leastCards = len;
			} else if (len === leastCards) {
				winners.set(player, 1);
			}
		}
		winners.forEach((value, player) => {
			player.finished = true;
		});
		this.end();
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated || !this.players[i].frozen) continue;
			const player = this.players[i];
			this.addBits(player, 500);
			this.winners.set(player, 1);
		}

		this.announceWinners();
	}

	filterPoolItem?(pokemon: IPokemon): boolean;
}

const commands: Dict<ICommandDefinition<Card>> = {
	cards: Games.sharedCommands.summary,
	hand: Games.sharedCommands.summary,
};

export const game: IGameTemplateFile<Card> = {
	commands,
	defaultOptions: ['cards'],
};
