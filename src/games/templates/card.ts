import type { Player } from '../../room-activity';
import { ScriptedGame } from '../../room-game-scripted';
import { assert, assertStrictEqual } from '../../test/test-tools';
import type { GameCommandDefinitions, GameFileTests, IGameTemplateFile, PlayerList } from '../../types/games';
import type { IItem, IMove, IPokemon, StatsTable } from '../../types/pokemon-showdown';

export interface IActionCardData<T extends ScriptedGame = ScriptedGame, U extends ICard = ICard> {
	getCard: (game: T) => ICard;
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
	effectType: 'move' | 'pokemon' | 'item';
	id: string;
	name: string;
	action?: IActionCardData;
	played?: boolean;
}

export interface IMoveCard extends ICard {
	accuracy: number;
	basePower: number;
	effectType: 'move';
	pp: number;
	type: string;
	availability?: number;
}

export interface IPokemonCard extends ICard {
	baseStats: StatsTable;
	color: string;
	effectType: 'pokemon';
	eggGroups: readonly string[];
	types: readonly string[];
	shiny?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IItemCard extends ICard {
	effectType: 'item';
}

export abstract class Card<ActionCardsType = Dict<IActionCardData>> extends ScriptedGame {
	abstract actionCards: ActionCardsType;

	awaitingCurrentPlayerCard: boolean = false;
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
	maxLateJoinRound: number = 0;
	maxPlayableGroupSize: number = 0;
	maxPlayers: number = 20;
	maximumPlayedCards: number = 1;
	minimumPlayedCards: number = 1;
	playerCards = new Map<Player, ICard[]>();
	playerList: Player[] = [];
	playerOrder: Player[] = [];
	showPlayerCards: boolean = false;
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

	isItemCard(card: ICard): card is IItemCard {
		return card.effectType === 'item';
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

	moveToActionCard<T extends ScriptedGame = ScriptedGame>(action: IActionCardData<T>): IMoveCard {
		const card = this.moveToCard(Dex.getExistingMove(action.name));
		// @ts-expect-error
		card.action = Object.assign({}, action);
		return card;
	}

	pokemonToCard(pokemon: IPokemon): IPokemonCard {
		return {
			baseStats: pokemon.baseStats,
			color: pokemon.color,
			effectType: 'pokemon',
			eggGroups: pokemon.eggGroups,
			id: pokemon.id,
			name: pokemon.name,
			types: pokemon.types,
		};
	}

	pokemonToActionCard<T extends ScriptedGame = ScriptedGame>(action: IActionCardData<T>): IPokemonCard {
		const card = this.pokemonToCard(Dex.getExistingPokemon(action.name));
		// @ts-expect-error
		card.action = Object.assign({}, action);
		return card;
	}

	itemToCard(item: IItem): IItemCard {
		return {
			effectType: 'item',
			id: item.id,
			name: item.name,
		};
	}

	itemToActionCard<T extends ScriptedGame = ScriptedGame>(action: IActionCardData<T>): IItemCard {
		const card = this.itemToCard(Dex.getExistingItem(action.name));
		// @ts-expect-error
		card.action = Object.assign({}, action);
		return card;
	}

	filterPokemonList(pokemon: IPokemon): boolean {
		if ((pokemon.forme && (!this.filterForme || !this.filterForme(pokemon))) ||
			(this.usesActionCards && pokemon.id in this.actionCards) || !Dex.hasGifData(pokemon) ||
			(this.filterPoolItem && !this.filterPoolItem(pokemon))) return false;
		return true;
	}

	createDeckPool(): void {
		this.deckPool = [];
		const pokemonList = Games.getPokemonList(pokemon => this.filterPokemonList(pokemon));
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

	containsCard(name: string, cards: ICard[]): boolean {
		return this.getCardIndex(name, cards) !== -1;
	}

	getCardIndex(name: string, cards: ICard[], otherPlayedCards?: ICard[]): number {
		const id = Tools.toId(name);
		let index = -1;
		for (let i = 0; i < cards.length; i++) {
			if (cards[i].id === id && (!otherPlayedCards || !otherPlayedCards.includes(cards[i]))) {
				index = i;
				break;
			}
		}
		return index;
	}

	getCardIndices(names: string[], cards: ICard[]): number[] {
		const indices: number[] = [];
		const allCards: ICard[] = [];
		for (const name of names) {
			const index = this.getCardIndex(name, cards, allCards);
			if (index !== -1) allCards.push(cards[index]);
			indices.push(index);
		}
		return indices;
	}

	getChatTypeLabel(card: IPokemonCard): string {
		const types = [];
		for (const type of card.types) {
			types.push(Dex.getTypeHtml(Dex.getExistingType(type), this.detailLabelWidth));
		}
		return types.join("&nbsp;/&nbsp;");
	}

	getEggGroupLabel(card: IPokemonCard): string {
		const eggGroups = [];
		for (const eggGroup of card.eggGroups) {
			const colorData = Tools.getEggGroupHexCode(eggGroup);
			eggGroups.push('<div style="display:inline-block;background-color:' + colorData.color + ';background:' +
				colorData.gradient + ';border: 1px solid #a99890;border-radius:3px;width:' + this.detailLabelWidth + 'px;' +
				'padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;font-size:8pt;text-align:center"><b>' +
				eggGroup + '</b></div>');
		}
		return eggGroups.join("&nbsp;/&nbsp;");
	}

	getChatColorLabel(card: IPokemonCard): string {
		const colorData = Tools.getPokemonColorHexCode(card.color);
		return '<div style="display:inline-block;background-color:' + colorData.color + ';background:' +
			colorData.gradient + ';border: 1px solid #a99890;border-radius:3px;width:' + this.detailLabelWidth + 'px;padding:1px;' +
			'color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;font-size:8pt;text-align:center"><b>' + card.color +
			'</b></div>';
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
				const colorData = Tools.getTypeHexCode(card.type);
				image = '<div style="display:inline-block;height:51px;width:' + (this.detailLabelWidth + 10) + '"><br /><div ' +
					'style="display:inline-block;background-color:' + colorData.color + ';background:' +
					colorData.gradient + ';border: 1px solid #a99890;border-radius:3px;width:' + this.detailLabelWidth + 'px;' +
					'padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;font-size:8pt"><b>' + card.type +
					'</b></div></div>';
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

	drawCard(player: Player, amount?: number | null, cards?: ICard[] | null): ICard[] {
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

		const playerCards = this.playerCards.get(player)!;
		for (const card of cards) {
			playerCards.push(card);
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

		const awaitingCurrentPlayerCard = this.awaitingCurrentPlayerCard && this.currentPlayer === player;
		let html = '';
		if (this.topCard && awaitingCurrentPlayerCard) {
			html += '<b>Top card</b>:<br /><center>' + this.getCardsPmHtml([this.topCard]) + '</center>';
		}

		if (drawnCardsMessage) html += drawnCardsMessage;

		if (this.getTurnCardsPmHtml && awaitingCurrentPlayerCard) {
			html += this.getTurnCardsPmHtml(player);
		} else {
			if (!playerCards.length) {
				html += '<h3>Your hand is empty!</h3>';
			} else {
				html += '<h3>Your cards' + (this.finitePlayerCards ? " (" + playerCards.length + ")" : "") + '</h3>';
				html += this.getCardsPmHtml(playerCards, player);
			}
		}

		player.sendHtmlPage(html);
	}

	onTimeLimit(): boolean {
		if (this.finitePlayerCards) {
			const winners = new Map<Player, number>();
			let leastCards = Infinity;
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const player = this.players[i];
				const cards = this.playerCards.get(player);
				if (!cards) throw new Error(player.name + " has no hand");
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
				player.metWinCondition = true;
			});
		}

		this.end();
		return true;
	}

	getNextPlayer(): Player | null {
		let player = this.playerList.shift();
		while (!player || player.eliminated) {
			if (!this.playerList.length) {
				this.playerList = this.playerOrder.slice();
				this.cardRound++;
				if (this.canLateJoin && this.maxLateJoinRound && this.cardRound > this.maxLateJoinRound) this.canLateJoin = false;
				if (this.parentGame && this.maxCardRounds && this.cardRound > this.maxCardRounds) {
					this.timeEnded = true;
					this.say("The game has reached the time limit!");
					this.onTimeLimit();
					return null;
				}
				const html = this.getRoundHtml(players => this.showPlayerCards ? this.getPlayerCards(players) : this.lives &&
					this.startingLives && this.startingLives > 1 ? this.getPlayerLives(players) : this.getPlayerNames(players),
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

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated || !this.players[i].metWinCondition) continue;
			const player = this.players[i];
			this.addBits(player, 500);
			this.winners.set(player, 1);
		}

		this.announceWinners();
	}

	/**Return `false` to filter `forme` out of the deck pool */
	filterForme?(forme: IPokemon): boolean;
	/**Return `false` to filter `item` out of the deck pool */
	filterPoolItem?(pokemon: IPokemon): boolean;
	getTurnCardsPmHtml?(player: Player): string;
}

const commands: GameCommandDefinitions<Card> = {};
commands.summary = Tools.deepClone(Games.sharedCommands.summary);
commands.summary.aliases = ['cards', 'hand'];

const tests: GameFileTests<Card> = {
	'it should have all required card properties': {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		test(game): void {
			const tackle = Dex.getExistingMove("Tackle");
			const moveCard = game.moveToCard(tackle, Dex.getMoveAvailability(tackle));

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

export const game: IGameTemplateFile<Card> = {
	commands,
	defaultOptions: ['cards'],
	tests,
};
