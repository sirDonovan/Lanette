import { ICommandDefinition } from '../../command-parser';
import { Player } from '../../room-activity';
import { DefaultGameOption, Game } from '../../room-game';
import { IMoveCopy, IPokemon, IPokemonCopy } from '../../types/in-game-data-types';

export interface IMoveCard extends IMoveCopy {
	action?: string;
	availability?: number;
	played?: boolean;
}

export interface IPokemonCard extends IPokemonCopy {
	action?: string;
	played?: boolean;
}

export type CardType = IMoveCard | IPokemonCard;

const typeColorCodes: Dict<{'background-color': string, 'background': string, 'border-color': string}> = {
	"White": {'background-color': '#eeeeee', 'background': 'linear-gradient(#eeeeee, #dddddd)', 'border-color': '#222222'},
	"Black": {'background-color': '#222222', 'background': 'linear-gradient(#222222, #111111)', 'border-color': '#eeeeee'},
	"Normal": {'background-color': '#8A8A59', 'background': 'linear-gradient(#A8A878,#8A8A59)', 'border-color': '#79794E'},
	"Fire": {'background-color': '#F08030', 'background': 'linear-gradient(#F08030,#DD6610)', 'border-color': '#B4530D'},
	"Water": {'background-color': '#6890F0', 'background': 'linear-gradient(#6890F0,#386CEB)', 'border-color': '#1753E3'},
	"Electric": {'background-color': '#F8D030', 'background': 'linear-gradient(#F8D030,#F0C108)', 'border-color': '#C19B07'},
	"Fairy": {'background-color': '#F830D0', 'background': 'linear-gradient(#F830D0,#F008C1)', 'border-color': '#C1079B'},
	"Grass": {'background-color': '#78C850', 'background': 'linear-gradient(#78C850,#5CA935)', 'border-color': '#4A892B'},
	"Ice": {'background-color': '#98D8D8', 'background': 'linear-gradient(#98D8D8,#69C6C6)', 'border-color': '#45B6B6'},
	"Fighting": {'background-color': '#C03028', 'background': 'linear-gradient(#C03028,#9D2721)', 'border-color': '#82211B'},
	"Poison": {'background-color': '#A040A0', 'background': 'linear-gradient(#A040A0,#803380)', 'border-color': '#662966'},
	"Ground": {'background-color': '#E0C068', 'background': 'linear-gradient(#E0C068,#D4A82F)', 'border-color': '#AA8623'},
	"Flying": {'background-color': '#A890F0', 'background': 'linear-gradient(#A890F0,#9180C4)', 'border-color': '#7762B6'},
	"Psychic": {'background-color': '#F85888', 'background': 'linear-gradient(#F85888,#F61C5D)', 'border-color': '#D60945'},
	"Bug": {'background-color': '#A8B820', 'background': 'linear-gradient(#A8B820,#8D9A1B)', 'border-color': '#616B13'},
	"Rock": {'background-color': '#B8A038', 'background': 'linear-gradient(#B8A038,#93802D)', 'border-color': '#746523'},
	"Ghost": {'background-color': '#705898', 'background': 'linear-gradient(#705898,#554374)', 'border-color': '#413359'},
	"Dragon": {'background-color': '#7038F8', 'background': 'linear-gradient(#7038F8,#4C08EF)', 'border-color': '#3D07C0'},
	"Steel": {'background-color': '#B8B8D0', 'background': 'linear-gradient(#B8B8D0,#9797BA)', 'border-color': '#7A7AA7'},
	"Dark": {'background-color': '#705848', 'background': 'linear-gradient(#705848,#513F34)', 'border-color': '#362A23'},
};

const colorsToType: Dict<string> = {
	"Green": "Grass",
	"Red": "Fighting",
	"Black": "Dark",
	"Blue": "Water",
	"White": "Steel",
	"Brown": "Rock",
	"Yellow": "Electric",
	"Purple": "Poison",
	"Pink": "Psychic",
	"Gray": "Normal",
};

export abstract class Card extends Game {
	// exported constants
	typeColorCodes: typeof typeColorCodes = typeColorCodes;

	actionCardAmount: number = 0;
	actionCards: Dict<string> = {};
	actionCardLabels: Dict<string> = {};
	autoFillHands: boolean = false;
	canLateJoin: boolean = true;
	cardRound: number = 0;
	categoriesNames: Dict<string> = {};
	colors: Dict<string> = {};
	colorsLimit: number = 0;
	currentPlayer: Player | null = null;
	deck: CardType[] = [];
	deckPool: CardType[] = [];
	defaultOptions: DefaultGameOption[] = ['cards'];
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
	abstract onInitialize(): void;
	abstract onNextRound(): void;
	abstract onStart(): void;

	isMoveBased(card: CardType): card is IMoveCard {
		return this.usesMoves;
	}

	createDeckPool() {
		this.deckPool = [];
		const pokemonList = Dex.getPokemonCopyList(pokemon => {
			if (pokemon.forme || pokemon.id in this.actionCards || !Dex.hasGifData(pokemon) || (this.filterPoolItem && this.filterPoolItem(pokemon))) return false;
			return true;
		});
		for (let i = 0; i < pokemonList.length; i++) {
			const pokemon = pokemonList[i];
			const color = Tools.toId(pokemon.color);
			if (!(color in this.colors)) this.colors[color] = pokemon.color;
			this.deckPool.push(pokemon);
		}
	}

	onAddPlayer(player: Player, lateJoin?: boolean) {
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
		for (let i = 0; i < card.types.length; i++) {
			types.push('<div style="display:inline-block;background-color:' + typeColorCodes[card.types[i]]['background-color'] + ';background:' + typeColorCodes[card.types[i]]['background'] + ';border-color:' + typeColorCodes[card.types[i]]['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:' + this.detailLabelWidth + 'px;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;font-size:8pt;text-align:center"><b>' + card.types[i] + '</b></div>');
		}
		return types.join("&nbsp;/&nbsp;");
	}

	getChatColorLabel(card: IPokemonCard): string {
		const type = colorsToType[card.color];
		return '<div style="display:inline-block;background-color:' + typeColorCodes[type]['background-color'] + ';background:' + typeColorCodes[type]['background'] + ';border-color:' + typeColorCodes[type]['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:' + this.detailLabelWidth + 'px;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;font-size:8pt;text-align:center"><b>' + card.color + '</b></div>';
	}

	getCardChatHtml(cards: CardType | CardType[]): string {
		if (!Array.isArray(cards)) cards = [cards];
		let html = '';
		let width = 0;
		const names: string[] = [];
		const images: string[] = [];
		let info = '';
		for (let i = 0; i < cards.length; i++) {
			let card = cards[i];
			let image = '';
			if (this.isMoveBased(card)) {
				names.push(cards[i].name);
				image = '<div style="display:inline-block;height:51px;width:' + (this.detailLabelWidth + 10) + '"><br /><div style="display:inline-block;background-color:' + typeColorCodes[card.type]['background-color'] + ';background:' + typeColorCodes[card.type]['background'] + ';border-color:' + typeColorCodes[card.type]['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:' + this.detailLabelWidth + 'px;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;font-size:8pt"><b>' + card.type + '</b></div></div>';
				width += this.detailLabelWidth;
			} else {
				card = card as IPokemonCard;
				names.push(cards[i].name + (card.shiny ? ' \u2605' : ''));
				image = Dex.getPokemonGif(card);
				width += Dex.data.gifData[card.id]!.front!.w;
			}

			images.push(image);
			if (!info) info = this.getCardChatDetails(cards[i]);
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
			if (this.topCard.action && this.topCard.action.startsWith('Draw')) {
				amount += parseInt(this.topCard.action.split('Draw ')[1].trim());
				this.topCard.action = '';
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
			for (let i = 0; i < cards.length; i++) {
				playerCards.push(cards[i]);
			}
		} else {
			this.dealHand(player, cards, 'drawn');
		}
		return cards;
	}

	dealHand(player: Player, highlightedCards?: CardType[], action?: 'drawn' | 'autodrawn' | 'played'): CardType[] {
		let handHtml = '';
		let highlightedCardsHtml = '';
		let playerCards = this.playerCards.get(player);
		let pmHeader = '';
		if (playerCards) {
			if (!playerCards.length) {
				handHtml = "You don't have any cards.";
			}
		} else {
			playerCards = [];
			for (let i = 0; i < this.options.cards; i++) {
				const card = this.getCard();
				playerCards.push(card);
			}
			pmHeader = "<b>Here's your hand</b>:";
		}
		let remainingCards = playerCards.length;
		let shownPlayerCards: CardType[] = [];
		if (highlightedCards && action === 'autodrawn') {
			for (let i = 0; i < playerCards.length; i++) {
				const card = playerCards[i];
				if (!highlightedCards.includes(card)) shownPlayerCards.push(card);
			}
		} else {
			shownPlayerCards = playerCards;
		}
		if (highlightedCards) {
			if (action === 'drawn') remainingCards += highlightedCards.length;
		}
		if (!pmHeader && this.finitePlayerCards) {
			pmHeader = '<b>' + remainingCards + ' card' + (remainingCards > 1 ? 's' : '') + ' remaining</b>:';
		}
		if (!handHtml) handHtml = this.getCardsPmHtml(shownPlayerCards, player);
		if (highlightedCards) {
			highlightedCardsHtml += '<br />';
			if (action === 'drawn') {
				highlightedCardsHtml += "<u><b>Newest card" + (highlightedCards.length > 1 ? "s" : "") + "</b></u>:<br />";

				// add to player's hand after generating playerCards HTML
				for (let i = 0; i < highlightedCards.length; i++) {
					playerCards.push(highlightedCards[i]);
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
				const html = this.getRoundHtml(this.showPlayerCards ? this.getPlayerCards : this.getPlayerNames, this.getRemainingPlayers(this.playerOrder), "Round " + this.cardRound);
				this.sayUhtml(this.uhtmlBaseName + '-round-html', html);
			}
			player = this.playerList.shift();
		}
		return player;
	}

	getPlayerCards(players?: Dict<Player> | Player[] | Map<Player, any>): string {
		return this.getPlayerAttributes(player => {
			const cards = this.playerCards.get(player);
			return player.name + (cards ? " (" + cards.length + ")" : "");
		}, players).join(', ');
	}

	timeEnd() {
		this.timeEnded = true;
		this.say("Time's up!");
		const winners = new Map();
		let leastCards = Infinity;
		for (const i in this.players) {
			const player = this.players[i];
			if (player.eliminated) continue;
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

	onEnd() {
		const winners: Player[] = [];
		for (const i in this.players) {
			const player = this.players[i];
			if (player.eliminated || !player.frozen) continue;
			winners.push(player);
			this.winners.set(player, 1);
		}
		const winLen = winners.length;
		if (winLen) {
			const names = winners.map(x => x.name).join(", ");
			this.say("**Winner" + (winLen > 1 ? "s" : "") + "**: " + names);
			for (let i = 0; i < winLen; i++) {
				this.addBits(winners[i], 500);
			}
		} else {
			this.say("No winners this game!");
		}
	}

	filterPoolItem?(pokemon: IPokemon): boolean;
}

export let commands: Dict<ICommandDefinition<Card>> = {
	cards: Games.sharedCommands.summary,
	hand: Games.sharedCommands.summary,
};
