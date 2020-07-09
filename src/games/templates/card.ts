import type { Player } from '../../room-activity';
import { Game } from '../../room-game';
import type { IPokemon, IMove, StatsTable } from '../../types/dex';
import type { GameCommandDefinitions, IGameTemplateFile } from '../../types/games';

export interface IActionCardData<T extends Game = Game, U extends ICard = ICard> {
	getRandomTarget?: (game: T, hand: U[]) => string | undefined;
	getAutoPlayTarget: (game: T, hand: U[]) => string | undefined;
	isPlayableTarget: (game: T, targets: string[], hand?: U[], player?: Player) => boolean;
	readonly description: string;
	readonly name: string;
	drawCards?: number;
	readonly requiredTarget?: boolean;
	skipPlayers?: number;
}

export interface ICard {
	effectType: 'move' | 'pokemon';
	id: string;
	name: string;
	action?: IActionCardData;
	displayName?: string;
	played?: boolean;
}

export interface IMoveCard extends ICard {
	type: string;
	availability?: number;
}

export interface IPokemonCard extends ICard {
	baseStats: StatsTable;
	color: string;
	types: readonly string[];
	shiny?: boolean;
}

export abstract class Card<ActionCardsType = Dict<IActionCardData>> extends Game {
	abstract actionCards: ActionCardsType;

	actionCardAmount: number = 0;
	autoFillHands: boolean = false;
	canLateJoin: boolean = true;
	cardRound: number = 0;
	categoriesNames: Dict<string> = {};
	colors: Dict<string> = {};
	colorsLimit: number = 0;
	currentPlayer: Player | null = null;
	deck: ICard[] = [];
	deckPool: (IMoveCard | IPokemonCard)[] = [];
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
	playerCards = new Map<Player, ICard[]>();
	playerList: Player[] = [];
	playerOrder: Player[] = [];
	showPlayerCards: boolean = false;
	timeEnded: boolean = false;
	timeLimit: number = 25 * 60 * 1000;
	typesLimit: number = 0;
	usesActionCards: boolean = true;
	usesColors: boolean = false;
	usesMoves: boolean = false;

	lives?: Map<Player, number>;
	startingLives?: number;

	// always truthy once the game starts
	topCard!: ICard;

	abstract createDeck(): void;
	abstract getCardChatDetails(card: ICard): string;
	abstract getCardsPmHtml(player: Player, cards: ICard[]): string;
	abstract onNextRound(): void;
	abstract onStart(): void;

	isMoveCard(card: ICard): card is IMoveCard {
		return card.effectType === 'move';
	}

	isPokemonCard(card: ICard): card is IPokemonCard {
		return card.effectType === 'pokemon';
	}

	moveToCard(move: IMove, availability?: number): IMoveCard {
		return {
			availability,
			effectType: 'move',
			id: move.id,
			name: move.name,
			type: move.type,
		};
	}

	pokemonToCard(pokemon: IPokemon): IPokemonCard {
		return {
			baseStats: pokemon.baseStats,
			color: pokemon.color,
			effectType: 'pokemon',
			id: pokemon.id,
			name: pokemon.name,
			types: pokemon.types,
		};
	}

	createDeckPool(): void {
		this.deckPool = [];
		const pokemonList = Games.getPokemonList(pokemon => {
			if (pokemon.forme || (this.usesActionCards && pokemon.id in this.actionCards) ||
				!Dex.hasGifData(pokemon) || (this.filterPoolItem && this.filterPoolItem(pokemon))) return false;
			return true;
		});

		for (const pokemon of pokemonList) {
			const color = Tools.toId(pokemon.color);
			if (!(color in this.colors)) this.colors[color] = pokemon.color;
			this.deckPool.push(this.pokemonToCard(pokemon));
		}
	}

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (lateJoin) {
			const cards = this.dealHand(player);
			this.playerCards.set(player, cards);
			this.playerOrder.push(player);
			this.playerList.push(player);
		}

		if (this.lives) {
			this.lives.set(player, this.startingLives!);
		}

		return true;
	}

	getCard(): ICard {
		let card = this.deck.shift();
		if (!card) {
			this.say("Shuffling the deck!");
			this.createDeck();
			card = this.deck[0];
			this.deck.shift();
		}
		return card;
	}

	getCardIndex(name: string, cards: ICard[]): number {
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
			types.push('<div style="display:inline-block;background-color:' + colorData['background-color'] + ';background:' +
				colorData['background'] + ';border-color:' + colorData['border-color'] + ';border: 1px solid #a99890;border-radius:3px;' +
				'width:' + this.detailLabelWidth + 'px;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;' +
				'font-size:8pt;text-align:center"><b>' + type + '</b></div>'
			);
		}
		return types.join("&nbsp;/&nbsp;");
	}

	getChatColorLabel(card: IPokemonCard): string {
		const colorData = Tools.hexColorCodes[Tools.pokemonColorHexColors[card.color]];
		return '<div style="display:inline-block;background-color:' + colorData['background-color'] + ';background:' +
			colorData['background'] + ';border-color:' + colorData['border-color'] + ';border: 1px solid #a99890;border-radius:3px;' +
			'width:' + this.detailLabelWidth + 'px;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;' +
			'font-size:8pt;text-align:center"><b>' + card.color + '</b></div>';
	}

	getCardChatHtml(cards: ICard | ICard[]): string {
		if (!Array.isArray(cards)) cards = [cards];
		let html = '';
		let width = 0;
		const names: string[] = [];
		const images: string[] = [];
		let info = '';
		for (const card of cards) {
			let image = '';
			if (this.isMoveCard(card)) {
				names.push(card.name);
				const colorData = Tools.hexColorCodes[Tools.typeHexColors[card.type]];
				image = '<div style="display:inline-block;height:51px;width:' + (this.detailLabelWidth + 10) + '"><br /><div ' +
					'style="display:inline-block;background-color:' + colorData['background-color'] + ';background:' +
					colorData['background'] + ';border-color:' + colorData['border-color'] + ';border: 1px solid #a99890;' +
					'border-radius:3px;width:' + this.detailLabelWidth + 'px;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;' +
					'text-transform: uppercase;font-size:8pt"><b>' + card.type + '</b></div></div>';
				width += this.detailLabelWidth;
			} else {
				names.push(card.name + ((card as IPokemonCard).shiny ? ' \u2605' : ''));
				image = Dex.getPokemonGif(Dex.getExistingPokemon(card.name));
				width += Dex.data.gifData[card.id]!.front!.w;
			}

			images.push(image);
			if (!info) info = this.getCardChatDetails(card);
		}
		width *= 1.5;
		if (width < 250) width = 250;
		html += '<div class="infobox" style="display:inline-block;width:' + (width + 10) + 'px;"><div class="infobox" style="width:' +
			width + 'px">' + names.join(", ") + '</div>';
		html += images.join("") + '<div class="infobox" style="width:' + width + 'px;">' + info + '</div></div>';
		return html;
	}

	drawCard(player: Player, amount?: number | null, cards?: ICard[] | null, dontShow?: boolean): ICard[] {
		if (!amount) {
			amount = this.drawAmount;
			if (this.topCard.action && this.topCard.action.drawCards) {
				amount += this.topCard.action.drawCards;
				delete this.topCard.action;
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

	dealHand(player: Player, highlightedCards?: ICard[], action?: 'drawn' | 'autodrawn' | 'played'): ICard[] {
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

		let shownPlayerCards: ICard[] = [];
		if (highlightedCards && action === 'autodrawn') {
			for (const card of playerCards) {
				if (!highlightedCards.includes(card)) shownPlayerCards.push(card);
			}
		} else {
			shownPlayerCards = playerCards;
		}
		if (!handHtml) handHtml = this.getCardsPmHtml(player, shownPlayerCards);

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
			highlightedCardsHtml += this.getCardsPmHtml(player, highlightedCards);
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
				const html = this.getRoundHtml(this.showPlayerCards ? this.getPlayerCards : this.lives && this.startingLives &&
					this.startingLives > 1 ? this.getPlayerLives : this.getPlayerNames,
					this.getRemainingPlayers(this.playerOrder), "Round " + this.cardRound);
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
		const winners = new Map<Player, number>();
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
			player.frozen = true;
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

const commands: GameCommandDefinitions<Card> = {};
commands.summary = Tools.deepClone(Games.sharedCommands.summary);
commands.summary.aliases = ['cards', 'hand'];

export const game: IGameTemplateFile<Card> = {
	commands,
	defaultOptions: ['cards'],
};
