import type { Player } from '../../room-activity';
import { Game } from '../../room-game';
import { assert, assertStrictEqual } from '../../test/test-tools';
import type { IMove, IPokemon, StatsTable } from '../../types/dex';
import type { GameCommandDefinitions, GameFileTests, IGameTemplateFile, PlayerList } from '../../types/games';

export interface ICardsSplitByPlayable {
	playable: ICard[];
	other: ICard[];
}

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
	accuracy: number;
	basePower: number;
	pp: number;
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

	canLateJoin: boolean = true;
	cardRound: number = 0;
	colors: Dict<string> = {};
	currentPlayer: Player | null = null;
	deck: ICard[] = [];
	deckPool: (IMoveCard | IPokemonCard)[] = [];
	detailLabelWidth: number = 75;
	drawAmount: number = 1;
	finitePlayerCards: boolean = false;
	maxCardRounds: number = 0;
	maxPlayers: number = 20;
	playerCards = new Map<Player, ICard[]>();
	playerList: Player[] = [];
	playerOrder: Player[] = [];
	showPlayerCards: boolean = false;
	timeEnded: boolean = false;
	usesActionCards: boolean = true;
	usesHtmlPage = true;

	lives?: Map<Player, number>;
	startingLives?: number;
	topCard?: ICard;

	abstract createDeck(): void;
	abstract getCardChatDetails(card: ICard): string;
	abstract getCardsPmHtml(cards: ICard[], player?: Player, playableCards?: boolean): string;
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
			accuracy: move.accuracy as number,
			basePower: move.basePower,
			availability,
			effectType: 'move',
			id: move.id,
			name: move.name,
			pp: move.pp,
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
			if ((pokemon.forme && (!this.filterForme || !this.filterForme(pokemon))) ||
				(this.usesActionCards && pokemon.id in this.actionCards) || !Dex.hasGifData(pokemon) ||
				(this.filterPoolItem && this.filterPoolItem(pokemon))) return false;
			return true;
		});

		for (const pokemon of pokemonList) {
			const color = Tools.toId(pokemon.color);
			if (!(color in this.colors)) this.colors[color] = pokemon.color;
			this.deckPool.push(this.pokemonToCard(pokemon));
		}
	}

	giveStartingCards(player: Player): void {
		const cards: ICard[] = [];
		for (let i = 0; i < this.format.options.cards; i++) {
			cards.push(this.getCard());
		}
		this.playerCards.set(player, cards);
	}

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (lateJoin) {
			this.giveStartingCards(player);
			this.updatePlayerHtmlPage(player);
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
			types.push(Dex.getTypeHtml(Dex.getExistingType(type), this.detailLabelWidth));
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
				const shinyPokemon = (card as IPokemonCard).shiny;
				names.push(card.name + (shinyPokemon ? ' \u2605' : ''));
				image = Dex.getPokemonGif(Dex.getExistingPokemon(card.name), undefined, undefined, shinyPokemon);
				width += Dex.data.gifData[card.id]!.front!.w;
			}

			images.push(image);
			if (!info) info = this.getCardChatDetails(card);
		}
		width *= 1.5;
		if (width < 250) width = 250;
		html += '<div class="infobox" style="width:' + (width + 10) + 'px;"><div class="infobox" style="width:' +
			width + 'px">' + names.join(", ") + '</div>';
		html += images.join("") + '<div class="infobox" style="width:' + width + 'px;">' + info + '</div></div>';
		return html;
	}

	drawCard(player: Player, amount?: number | null, cards?: ICard[] | null, dontShow?: boolean): ICard[] {
		if (!amount) {
			amount = this.drawAmount;
			if (this.topCard && this.topCard.action && this.topCard.action.drawCards) {
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
			this.updatePlayerHtmlPage(player, cards);
		}

		return cards;
	}

	updatePlayerHtmlPage(player: Player, drawnCards?: ICard[]): void {
		const playerCards = this.playerCards.get(player)!;

		let drawnCardsMessage = '';
		if (drawnCards) {
			for (const card of drawnCards) {
				if (!playerCards.includes(card)) playerCards.push(card);
			}
			drawnCardsMessage = "You drew: " + Tools.joinList(drawnCards.map(x => x.name), "<b>", "</b>");
		}

		const isCurrentPlayer = this.currentPlayer === player;
		let html = '';
		if (this.topCard && isCurrentPlayer) {
			html += '<b>Top card</b>:<br /><center>' + this.getCardsPmHtml([this.topCard]) + '</center><br /><br />';
		}

		if (drawnCardsMessage) html += drawnCardsMessage + '<br /><br />';
		if (this.splitCardsByPlayable && isCurrentPlayer) {
			const split = this.splitCardsByPlayable(playerCards);
			if (split.playable.length) {
				html += '<b>Playable cards</b>:<br />';
				html += this.getCardsPmHtml(split.playable, player, true);
			}
			if (split.other.length) {
				if (split.playable.length) {
					html += '<br /><b>Other cards</b>:<br />';
				} else {
					html += '<b>Your cards</b>:<br />';
				}
				html += this.getCardsPmHtml(split.other, player);
			}
		} else {
			if (!playerCards.length) {
				html += '<b>You do not have any cards</b>!';
			} else {
				html += '<b>Your cards' + (this.finitePlayerCards ? " (" + playerCards.length + ")" : "") + '</b>:<br />';
				html += this.getCardsPmHtml(playerCards, player);
			}
		}

		player.sendHtmlPage(html);
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

	getPlayerCards(players?: PlayerList): string {
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

	/**Return `false` to filter `forme` out of the deck pool */
	filterForme?(forme: IPokemon): boolean;
	filterPoolItem?(pokemon: IPokemon): boolean;
	splitCardsByPlayable?(cards: ICard[]): ICardsSplitByPlayable;
}

const commands: GameCommandDefinitions<Card> = {};
commands.summary = Tools.deepClone(Games.sharedCommands.summary);
commands.summary.aliases = ['cards', 'hand'];

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const tests: GameFileTests<Card> = {
	'it should have all required card properties': {
		test(game, format): void {
			const tackle = Dex.getExistingMove("Tackle");
			const moveCard = game.moveToCard(tackle, Dex.getMoveAvailability(tackle, Games.getPokemonList()));

			assertStrictEqual(typeof moveCard.accuracy, 'number');
			assertStrictEqual(typeof moveCard.availability, 'number');
			assertStrictEqual(typeof moveCard.basePower, 'number');
			assertStrictEqual(typeof moveCard.id, 'string');
			assertStrictEqual(typeof moveCard.name, 'string');
			assertStrictEqual(typeof moveCard.pp, 'number');
			assertStrictEqual(typeof moveCard.type, 'string');

			const pokemonCard = game.pokemonToCard(Dex.getExistingPokemon("Pikachu"));

			assert(pokemonCard.baseStats);
			assertStrictEqual(typeof pokemonCard.baseStats, 'object');
			assertStrictEqual(typeof pokemonCard.color, 'string');
			assertStrictEqual(typeof pokemonCard.id, 'string');
			assertStrictEqual(typeof pokemonCard.name, 'string');
			assertStrictEqual(Array.isArray(pokemonCard.types), true);
		},
	},
};
/* eslint-enable */

export const game: IGameTemplateFile<Card> = {
	commands,
	defaultOptions: ['cards'],
	tests,
};
