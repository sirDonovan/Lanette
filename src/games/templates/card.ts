import type { CardMatchingPage } from '../../html-pages/activity-pages/card-matching';
import type { Player } from '../../room-activity';
import { ScriptedGame } from '../../room-game-scripted';
import type { Room } from '../../rooms';
import { assert, assertStrictEqual } from '../../test/test-tools';
import type { ModelGeneration } from '../../types/dex';
import type { GameCommandDefinitions, GameFileTests, IGameTemplateFile, PlayerList } from '../../types/games';
import type { IItem, IMove, IPokemon, StatsTable } from '../../types/pokemon-showdown';
import type { GameActionGames } from '../../types/storage';

export interface IActionCardData<T extends ScriptedGame = ScriptedGame, U extends ICard = ICard> {
	getCard: (game: T) => ICard;
	getRandomTarget?: (game: T, player: Player, cardsSubset?: U[]) => string | undefined;
	getAutoPlayTarget: (game: T, player: Player, cardsSubset?: U[]) => string | undefined;
	getTargetErrors: (game: T, targets: string[], player: Player, cardsSubset?: U[]) => string | undefined;
	readonly description: string;
	readonly name: string;
	drawCards?: number;
	readonly noOldGen?: boolean;
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

export interface IItemCard extends ICard {
	effectType: 'item';
}

const GAME_ACTION_TYPE: GameActionGames = 'card';
const HTML_PAGE_COMMAND = 'cardhtmlpage';

export abstract class CardGame<ActionCardsType extends object = Dict<IActionCardData>> extends ScriptedGame {
	abstract actionCards: ActionCardsType;
	abstract playCommand: string;

	awaitingCurrentPlayerCard: boolean = false;
	canLateJoin: boolean = true;
	cardRound: number = 0;
	colors: Dict<string> = {};
	deltaTypes: boolean = false;
	deck: ICard[] = [];
	deckPool: (IMoveCard | IPokemonCard)[] = [];
	detailLabelWidth: number = 75;
	drawAmount: number = 1;
	finitePlayerCards: boolean = false;
	gameActionType = GAME_ACTION_TYPE;
	hackmonsTypes: boolean = false;
	htmlPages = new Map<Player, CardMatchingPage>();
	htmlPageCommand: string = HTML_PAGE_COMMAND;
	inverseTypes: boolean = false;
	lastPlayer: Player | null = null;
	maxCardRounds: number = 0;
	maxLateJoinRound: number = 0;
	maxPlayers: number = 20;
	playerCards = new Map<Player, ICard[]>();
	playerList: Player[] = [];
	playerOrder: Player[] = [];
	showPlayerCards: boolean = false;
	usesActionCards: boolean = true;
	usesColors: boolean = false;
	usesEggGroups: boolean = false;
	usesTypings: boolean = true;
	usesHtmlPage = true;

	declare readonly room: Room;

	gifGeneration?: ModelGeneration;
	maximumPlayedCards?: number;
	maxShownPlayableGroupSize?: number;
	requiredGen?: number;
	topCard?: ICard;

	abstract createDeck(): void;
	abstract createHtmlPage(player: Player): CardMatchingPage;
	abstract getCardChatDetails(card: ICard): string;
	abstract onNextRound(): void;
	abstract onStart(): void;

	onSignups(): void {
		if (this.requiredGen) {
			if (this.requiredGen === 1) {
				this.gifGeneration = 'rb';
			} else if (this.requiredGen === 2) {
				this.gifGeneration = 'gs';
			} else if (this.requiredGen === 3) {
				this.gifGeneration = 'rs';
			} else if (this.requiredGen === 4) {
				this.gifGeneration = 'dp';
			} else if (this.requiredGen === 5) {
				this.gifGeneration = 'bw';
			}
		} else {
			this.gifGeneration = 'xy';
		}
	}

	getDex(): typeof Dex {
		if (this.requiredGen) return Dex.getDex("gen" + this.requiredGen);
		return Dex;
	}

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

	filterPokemonList(dex: typeof Dex, pokemon: IPokemon): boolean {
		if ((pokemon.forme && (!this.filterForme || !this.filterForme(dex, pokemon))) ||
			(this.usesActionCards && pokemon.id in this.actionCards) || !Dex.hasModelData(pokemon, this.gifGeneration) ||
			(this.filterPoolItem && !this.filterPoolItem(dex, pokemon))) return false;
		return true;
	}

	createDeckPool(): void {
		this.deckPool = [];

		const dex = this.getDex();
		let pokemonList: readonly IPokemon[];
		if (this.hackmonsTypes) {
			const list: IPokemon[] = [];
			for (const key of dex.getData().pokemonKeys) {
				const pokemon = dex.getExistingPokemon(key);
				if (!Dex.hasModelData(pokemon) || (this.usesActionCards && pokemon.id in this.actionCards)) continue;
				list.push(pokemon);
			}
			pokemonList = list;
		} else {
			pokemonList = Games.getPokemonList({filter: pokemon => this.filterPokemonList(dex, pokemon), gen: this.requiredGen});
		}

		for (const pokemon of pokemonList) {
			const color = Tools.toId(pokemon.color);
			if (!(color in this.colors)) this.colors[color] = pokemon.color;

			let card = this.pokemonToCard(pokemon);
			if (this.alterCard) card = this.alterCard(dex, card) as IPokemonCard;

			this.deckPool.push(card);
		}
	}

	giveStartingCards(player: Player): void {
		const cards: ICard[] = [];
		for (let i = 0; i < this.options.cards!; i++) {
			cards.push(this.getCard());
		}

		this.playerCards.set(player, cards);
		this.getHtmlPage(player).renderHandHtml();
	}

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		this.createHtmlPage(player);

		if (lateJoin) {
			this.giveStartingCards(player);
			this.sendHtmlPage(player);
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
			const colorData = Tools.getEggGroupHexCode(eggGroup)!;
			eggGroups.push(Tools.getTypeOrColorLabel(colorData, eggGroup, this.detailLabelWidth));
		}
		return eggGroups.join("&nbsp;/&nbsp;");
	}

	getChatColorLabel(card: IPokemonCard): string {
		return Tools.getTypeOrColorLabel(Tools.getPokemonColorHexCode(card.color)!, card.color, this.detailLabelWidth);
	}

	getCardChatHtml(cards: ICard | ICard[]): string {
		if (!Array.isArray(cards)) cards = [cards];
		let html = '';
		let width = 0;
		const names: string[] = [];
		const images: string[] = [];
		const dex = this.getDex();
		const allCardsDetails: string[] = [];
		for (const card of cards) {
			let image = '';
			if (this.isMoveCard(card)) {
				names.push(card.name);
			} else {
				const shinyPokemon = (card as IPokemonCard).shiny;
				names.push(card.name + (shinyPokemon ? ' \u2605' : ''));
				const pokemon = dex.getExistingPokemon(card.name);
				image = Dex.getPokemonModel(pokemon, shinyPokemon && this.gifGeneration === 'rb' ? 'gs' : this.gifGeneration, undefined,
					shinyPokemon);
				width += Dex.getModelData(pokemon, this.gifGeneration)!.w;
			}

			images.push(image);
			const details = this.getCardChatDetails(card);
			if (!allCardsDetails.includes(details)) allCardsDetails.push(details);
		}

		width *= 1.5;
		if (width < 250) width = 250;
		html += '<div class="infobox" style="width:' + (width + 10) + 'px;"><div class="infobox" style="width:' +
			width + 'px"><b>' + names.join(", ") + '</b></div>';
		html += images.join("") + '<div class="infobox" style="width:' + width + 'px;">' + allCardsDetails.join(", ") + '</div></div>';
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

	getHtmlPage(player: Player): CardMatchingPage {
		return this.htmlPages.get(player) || this.createHtmlPage(player);
	}

	onTimeLimit(): boolean {
		if (this.finitePlayerCards) {
			const winners = new Map<Player, number>();
			let leastCards: number | undefined;
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const player = this.players[i];
				const cards = this.playerCards.get(player);
				if (!cards) throw new Error(player.name + " has no hand");
				const len = cards.length;
				if (leastCards === undefined || len < leastCards) {
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
		let newCardRound = false;

		let player = this.playerList.shift();
		while (!player || player.eliminated) {
			if (!this.playerList.length) {
				this.playerList = this.playerOrder.slice();
				this.cardRound++;
				newCardRound = this.cardRound > 1;

				if (this.canLateJoin && this.maxLateJoinRound && this.cardRound > this.maxLateJoinRound) this.canLateJoin = false;
				if (this.parentGame && this.maxCardRounds && this.cardRound > this.maxCardRounds) {
					this.say("The game has reached the time limit!");
					this.onTimeLimit();
					return null;
				}

				const html = this.getRoundHtml(players => this.showPlayerCards ? this.getPlayerCards(players) : this.lives &&
					this.startingLives && this.startingLives > 1 ? this.getPlayerLives(players) : this.getPlayerNames(players),
					this.getRemainingPlayers(this.playerOrder));
				this.sayUhtml(this.uhtmlBaseName + '-round-html', html);
			}

			player = this.playerList.shift();
		}

		if (newCardRound) {
			for (const i in this.players) {
				if (!this.players[i].eliminated && this.players[i] !== player && this.players[i] !== this.lastPlayer) {
					this.sendChatHtmlPage(this.players[i]);
				}
			}
		}

		return player;
	}

	getPlayerCards(players?: PlayerList): string {
		return this.getPlayerAttributes(player => {
			const cards = this.playerCards.get(player);
			return this.getPlayerUsernameHtml(player.name) + (cards ? " (" + cards.length + ")" : "");
		}, players).join(', ');
	}

	getPlayerSummary(player: Player): void {
		if (player.eliminated) return;
		this.sendHtmlPage(player);
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.playerCards.clear();
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
	filterForme?(dex: typeof Dex, forme: IPokemon): boolean;
	/**Return `false` to filter `item` out of the deck pool */
	filterPoolItem?(dex: typeof Dex, pokemon: IPokemon): boolean;
	alterCard?(dex: typeof Dex, card: ICard): ICard;
	getTurnCardsPmHtml?(player: Player): string;
	getPlayerTurnHtml?(player: Player): string;
}

const commands: GameCommandDefinitions<CardGame> = {
	[HTML_PAGE_COMMAND]: {
		command(target, room, user) {
			this.runHtmlPageCommand(target, user);
			return true;
		},
		eliminatedGameCommand: true,
		pmGameCommand: true,
	},
};
commands.summary = Tools.deepClone(Games.getSharedCommands().summary);
commands.summary.aliases = ['cards', 'hand'];

const tests: GameFileTests<CardGame> = {
	'it should have all required card properties': {
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

export const game: IGameTemplateFile<CardGame> = {
	category: 'tabletop',
	commands,
	defaultOptions: ['cards'],
	tests,
};
