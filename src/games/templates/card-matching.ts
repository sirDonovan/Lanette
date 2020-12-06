import type { Player } from '../../room-activity';
import { addPlayers, assert } from '../../test/test-tools';
import type {
	GameCategory, GameCommandDefinitions, GameFileTests, IGameAchievement, IGameTemplateFile
} from '../../types/games';
import type { IPokemon } from '../../types/pokemon-showdown';
import type { IActionCardData, ICard, ICardsSplitByPlayable, IPokemonCard } from './card';
import { Card, game as cardGame } from './card';

interface IPreviouslyPlayedCard {
	card: string;
	detail?: string;
	shiny?: boolean;
}

export abstract class CardMatching<ActionCardsType = Dict<IActionCardData>> extends Card<ActionCardsType> {
	actionCardAmount: number = 5;
	autoFillHands: boolean = false;
	awaitingCurrentPlayerCard: boolean = false;
	canPlay: boolean = false;
	colorsLimit: number = 0;
	deckPool: IPokemonCard[] = [];
	eggGroupsLimit: number = 0;
	playerInactiveRoundLimit: number = 3;
	lastPlayer: Player | null = null;
	maxCardRounds: number = 30;
	maxPlayers: number = 15;
	minimumPlayedCards: number = 1;
	playableCardDescription: string = '';
	previouslyPlayedCards: IPreviouslyPlayedCard[] = [];
	previouslyPlayedCardsAmount: number = 4;
	roundDrawAmount: number = 0;
	showPlayerCards: boolean = true;
	timeLimit: number = 25 * 60 * 1000;
	turnTimeLimit: number = 30 * 1000;
	typesLimit: number = 0;
	usesColors: boolean = true;

	// always truthy once the game starts
	topCard!: IPokemonCard;

	drawAchievement?: IGameAchievement;
	drawAchievementAmount?: number;
	shinyCardAchievement?: IGameAchievement;

	abstract arePlayableCards(cards: ICard[]): boolean;
	abstract isPlayableCard(card: ICard, otherCard?: ICard): boolean;
	abstract onRemovePlayer(player: Player): void;
	abstract playActionCard(card: ICard, player: Player, targets: string[], cards: ICard[]): ICard[] | boolean;

	filterForme(forme: IPokemon): boolean {
		const baseSpecies = Dex.getExistingPokemon(forme.baseSpecies);
		if ((baseSpecies.color !== forme.color || !Tools.compareArrays(baseSpecies.types, forme.types)) &&
			!(baseSpecies.name === "Arceus" || baseSpecies.name === "Silvally")) return true;
		return false;
	}

	createDeck(): void {
		const colorCounts: Dict<number> = {};
		const eggGroupCounts: Dict<number> = {};
		const typeCounts: Dict<number> = {};
		if (!this.deckPool.length) this.createDeckPool();
		const pokedex = this.shuffle(this.deckPool);
		const deck: ICard[] = [];
		const minimumDeck = (this.maxPlayers + 1) * this.format.options.cards;
		outer:
		for (const pokemon of pokedex) {
			if (this.colorsLimit && pokemon.color in colorCounts && colorCounts[pokemon.color] >= this.colorsLimit) continue;
			if (this.eggGroupsLimit) {
				for (const eggGroup of pokemon.eggGroups) {
					if (eggGroup in eggGroupCounts && eggGroupCounts[eggGroup] >= this.eggGroupsLimit) continue outer;
				}
			}
			if (this.typesLimit) {
				for (const type of pokemon.types) {
					if (type in typeCounts && typeCounts[type] >= this.typesLimit) continue outer;
				}
			}

			if (!(pokemon.color in colorCounts)) colorCounts[pokemon.color] = 0;
			colorCounts[pokemon.color]++;

			for (const eggGroup of pokemon.eggGroups) {
				if (!(eggGroup in eggGroupCounts)) eggGroupCounts[eggGroup] = 0;
				eggGroupCounts[eggGroup]++;
			}

			for (const type of pokemon.types) {
				if (!(type in typeCounts)) typeCounts[type] = 0;
				typeCounts[type]++;
			}
			if (this.rollForShinyPokemon()) pokemon.shiny = true;
			deck.push(pokemon);
		}

		if (deck.length < minimumDeck) {
			this.createDeck();
			return;
		}

		const actionCards = Object.keys(this.actionCards);
		if (actionCards.length && this.usesActionCards) {
			let actionCardAmount = this.actionCardAmount;
			let totalActionCards = actionCards.length * actionCardAmount;
			while (totalActionCards / (deck.length + totalActionCards) > 0.2) {
				actionCardAmount--;
				totalActionCards = actionCards.length * actionCardAmount;
			}

			if (actionCardAmount < 2) {
				this.createDeck();
				return;
			}

			this.actionCardAmount = actionCardAmount;
			for (const action of actionCards) {
				for (let i = 0; i < actionCardAmount; i++) {
					// @ts-expect-error
					deck.push((this.actionCards[action] as IActionCardData).getCard(this));
				}
			}
		}

		this.deck = this.shuffle(deck);
	}

	getTopCardHtml(): string {
		return (this.previouslyPlayedCardsAmount ? this.getPreviouslyPlayedCardsHtml() + '<br />' : '') +
			this.getCardChatHtml(this.topCard);
	}

	getCardChatDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card) + '<br />' + this.getChatColorLabel(card);
	}

	getPreviouslyPlayedCardsHtml(): string {
		let html = '';
		const lowestOpacity = 25;
		const opacityIncrement = Math.floor((100 - lowestOpacity) / this.previouslyPlayedCardsAmount);
		for (let i = 0; i < this.previouslyPlayedCards.length; i++) {
			const card = this.previouslyPlayedCards[i];
			const cardText = card.card + (card.detail ? ' (' + card.detail + ')' : '');
			html += '<div class="infobox" style="width:' + (cardText.length * 8) + 'px;opacity:' + (lowestOpacity +
				(opacityIncrement * i)) + '%;' + (card.shiny ? 'color: ' + Tools.hexColorCodes['Dark-Yellow']['background-color'] : '') +
				'">' + cardText + '</div>';
		}
		return html;
	}

	getCardPmHtml(card: ICard, player?: Player, showPlayable?: boolean): string {
		const width = this.detailLabelWidth * (card === this.topCard ? 3 : 3.5);
		let html = '<div class="infobox" style="width: ' + width + 'px">';

		if (player && showPlayable) {
			if (card.action && card.action.getRandomTarget) {
				html += Client.getPmSelfButton(Config.commandCharacter + "play " +
					card.action.getRandomTarget(this, this.playerCards.get(player)!), "Play randomized") + " or play manually!";
			} else {
				if (card.action && card.action.requiredTarget) {
					html += '<b>Play manually!</b>';
				} else {
					html += Client.getPmSelfButton(Config.commandCharacter + "play " + card.name, "Play!");
				}
			}
			html += '<br />';
		}

		html += '<center>';
		if (Dex.data.pokemonKeys.includes(card.id)) {
			html += Dex.getPokemonIcon(Dex.getExistingPokemon(card.name));
		}
		html += card.name + '<br />';

		if (card.action) {
			if (this.usesColors) {
				html += '<div style="background-color:' + Tools.hexColorCodes['White']['background-color'] +
					';background:' + Tools.hexColorCodes['White']['background'] + ';border: 1px solid #a99890;border-radius:3px;width:' +
					this.detailLabelWidth + 'px;padding:1px;color:#333;text-shadow:1px 1px 1px #eee;text-transform: uppercase;' +
					'text-align:center;font-size:8pt"><b>Action</b></div>';
			}

			html += '<div style="background-color:' + Tools.hexColorCodes['Black']['background-color'] +
				';background:' + Tools.hexColorCodes['Black']['background'] + ';border: 1px solid #a99890;border-radius:3px;width:auto;' +
				'padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;' +
				'text-align:center;font-size:8pt"><b>' + card.action.description + '</b></div>';
		} else {
			html += this.getCardPmDetails(card as IPokemonCard);
		}

		html += '</center></div>';
		return html;
	}

	getCardPmDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card) + "<br />" + this.getChatColorLabel(card);
	}

	getCardsPmHtml(cards: ICard[], player?: Player, playableCards?: boolean): string {
		const html: string[] = [];
		for (const card of cards) {
			html.push('<div style="height:auto">' + this.getCardPmHtml(card, player, playableCards) + '</div>');
		}
		return html.join("<br />");
	}

	setTopCard(card: IPokemonCard, player: Player): void {
		this.topCard = card;
		if (card.shiny && !card.played) this.onShinyTopCard(player);
	}

	onShinyTopCard(player: Player): void {
		this.sayHtml("<center>" + this.getCardChatHtml(this.topCard) + "</center>");
		if (!player.eliminated && this.shinyCardAchievement) this.unlockAchievement(player, this.shinyCardAchievement);
		this.topCard.played = true;
	}

	onStart(): void {
		this.createDeck();
		this.playerOrder = this.shufflePlayers();
		this.say("Now sending out cards!");
		for (const i in this.players) {
			this.giveStartingCards(this.players[i]);
			this.updatePlayerHtmlPage(this.players[i]);
		}

		// may be set in tests
		if (!this.topCard) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			let topCard = this.deck.shift();
			while (topCard && topCard.action) {
				this.deck.push(topCard);
				topCard = this.deck.shift();
			}
			if (!topCard) throw new Error("Invalid top card");
			this.topCard = topCard as IPokemonCard;
		}

		this.nextRound();
		this.storePreviouslyPlayedCard({card: Users.self.name + "'s " + this.topCard.name});
	}

	getPlayableCards(player: Player): string[] {
		const cards = this.playerCards.get(player);
		if (!cards) throw new Error(player.name + " has no hand");
		if (cards.length < this.minimumPlayedCards) return [];

		const playableCards: string[] = [];
		if (this.minimumPlayedCards === 1) {
			for (const card of cards) {
				if (card.action) {
					const autoPlay = card.action.getAutoPlayTarget(this, cards);
					if (autoPlay) playableCards.push(autoPlay);
				} else {
					if (this.isPlayableCard(card, this.topCard)) playableCards.push(card.name);
				}
			}
		} else {
			for (const card of cards) {
				if (card.action) {
					const autoPlay = card.action.getAutoPlayTarget(this, cards);
					if (autoPlay) playableCards.push(autoPlay);
				} else {
					for (const otherCard of cards) {
						if (card === otherCard || otherCard.action) continue;
						if (this.arePlayableCards([this.topCard, card, otherCard])) {
							playableCards.push(card.name + ", " + otherCard.name);
						}
					}
				}
			}
		}

		return playableCards;
	}

	splitCardsByPlayable(cards: ICard[]): ICardsSplitByPlayable {
		const playable: ICard[] = [];
		const other: ICard[] = [];

		if (this.minimumPlayedCards > 1) {
			for (const card of cards) {
				if (card.action) {
					const autoPlay = card.action.getAutoPlayTarget(this, cards);
					if (autoPlay && !card.action.requiredTarget) {
						playable.push(card);
					} else {
						other.push(card);
					}
				} else {
					other.push(card);
				}
			}
		} else {
			for (const card of cards) {
				if (card.action) {
					const autoPlay = card.action.getAutoPlayTarget(this, cards);
					if (autoPlay) {
						playable.push(card);
					} else {
						other.push(card);
					}
				} else {
					if (this.isPlayableCard(card, this.topCard)) {
						playable.push(card);
					} else {
						other.push(card);
					}
				}
			}
		}

		return {playable, other};
	}

	hasPlayableCard(player: Player): boolean {
		return !!this.getPlayableCards(player).length;
	}

	timeEnd(): void {
		this.timeEnded = true;
		this.say("Time is up!");
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
			player.frozen = true;
		});
		this.end();
	}

	onNextRound(): void {
		this.canPlay = false;
		if (this.currentPlayer) {
			this.lastPlayer = this.currentPlayer;
			this.currentPlayer = null;
		}

		if (Date.now() - this.startTime! > this.timeLimit) return this.timeEnd();
		if (this.getRemainingPlayerCount() <= 1) {
			const finalPlayer = this.getFinalPlayer();
			if (finalPlayer) finalPlayer.frozen = true;
			this.end();
			return;
		}

		const currentRound = this.round;
		let player = this.getNextPlayer();
		if (!player || this.timeEnded) return;

		if (this.topCard.action && this.topCard.action.skipPlayers) {
			this.say(player.name + "'s turn was skipped!");
			this.topCard.action.skipPlayers--;
			if (!this.topCard.action.skipPlayers) delete this.topCard.action;
			return this.nextRound();
		}

		const autoDraws = new Map<Player, ICard[]>();
		let hasCard = this.hasPlayableCard(player);
		let drawCount = 0;
		while (!hasCard) {
			drawCount++;
			const cards = this.drawCard(player);
			let drawnCards = autoDraws.get(player) || [];
			drawnCards = drawnCards.concat(cards);
			autoDraws.set(player, drawnCards);
			player = this.getNextPlayer();
			if (!player) {
				if (this.timeEnded) break; // eslint-disable-line @typescript-eslint/no-unnecessary-condition
				throw new Error("No player given by Game.getNextPlayer");
			}
			hasCard = this.hasPlayableCard(player);
		}

		if (this.drawAchievement && this.drawAchievementAmount && this.lastPlayer && drawCount >= this.drawAchievementAmount &&
			!this.lastPlayer.eliminated) {
			this.unlockAchievement(this.lastPlayer, this.drawAchievement);
		}

		if (this.timeEnded) return; // eslint-disable-line @typescript-eslint/no-unnecessary-condition

		let useUhtmlAuto = this.round === currentRound;
		if (autoDraws.size) {
			if (useUhtmlAuto) useUhtmlAuto = false;
			const names: string[] = [];
			autoDraws.forEach((cards, autoDrawPlayer) => {
				if (autoDrawPlayer.eliminated) return;
				this.updatePlayerHtmlPage(autoDrawPlayer, cards);
				names.push("__" + autoDrawPlayer.name + "__");
			});
			this.say("Automatically drawing for: " + names.join(", "));
		}

		// needs to be set outside of on() for tests
		this.currentPlayer = player;

		const html = this.getMascotAndNameHtml() + "<br /><center>" + this.getTopCardHtml() + "<br /><br /><b><username>" + player!.name +
			"</username></b>'s turn!</center>";
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			// left before text appeared
			if (player!.eliminated) {
				this.nextRound();
				return;
			}

			this.awaitingCurrentPlayerCard = true;
			this.canPlay = true;
			this.updatePlayerHtmlPage(player!);
			player!.sendHighlightPage("It is your turn!");

			this.timeout = setTimeout(() => {
				if (!player!.eliminated) {
					if (this.addPlayerInactiveRound(player!) && !(this.parentGame && this.parentGame.id === '1v1challenge')) {
						this.say(player!.name + " DQed for inactivity!");
						// nextRound() called in onRemovePlayer
						this.eliminatePlayer(player!, "You did not play a card for " + this.playerInactiveRoundLimit + " rounds!");

						const remainingPlayers: Player[] = [];
						for (const i in this.players) {
							if (!this.players[i].eliminated) remainingPlayers.push(this.players[i]);
						}
						if (remainingPlayers.length === 1) remainingPlayers[0].frozen = true;

						this.onRemovePlayer(player!);
					} else {
						player!.useCommand('draw');
					}
				} else {
					this.nextRound();
				}
			}, this.turnTimeLimit);
		});

		if (useUhtmlAuto) {
			this.sayUhtmlAuto(uhtmlName, html);
		} else {
			this.sayUhtml(uhtmlName, html);
		}
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

	isCardPair(card: IPokemonCard, otherCard: IPokemonCard): boolean {
		if ((card !== this.topCard && card.action) || (otherCard !== this.topCard && otherCard.action)) {
			return false;
		}
		if (card.color === otherCard.color) return true;
		for (const type of otherCard.types) {
			if (card.types.includes(type)) return true;
		}
		return false;
	}

	storePreviouslyPlayedCard(card: IPreviouslyPlayedCard): void {
		if (this.previouslyPlayedCardsAmount) {
			while (this.previouslyPlayedCards.length >= this.previouslyPlayedCardsAmount) {
				this.previouslyPlayedCards.shift();
			}
			this.previouslyPlayedCards.push(card);
		}
	}

	playCard(card: ICard, player: Player, targets: string[], cards: ICard[]): ICard[] | boolean {
		card.displayName = player.name + "'s " + card.name;

		if (card.action) {
			return this.playActionCard(card, player, targets, cards);
		} else {
			return this.playRegularCard(card as IPokemonCard, player, targets, cards);
		}
	}

	playRegularCard(card: IPokemonCard, player: Player, targets: string[], cards: ICard[]): ICard[] | boolean {
		let drawCards = this.roundDrawAmount;
		if (this.topCard.action && this.topCard.action.drawCards) {
			drawCards = this.topCard.action.drawCards;
			delete this.topCard.action;
		}

		if (this.autoFillHands) {
			const remainingCards = cards.length - 1;
			if (remainingCards && (remainingCards + drawCards) < this.minimumPlayedCards) {
				drawCards += this.minimumPlayedCards - remainingCards;
			}
		}

		this.awaitingCurrentPlayerCard = false;
		this.currentPlayer = null;
		cards.splice(cards.indexOf(card), 1);

		if (!player.eliminated) {
			let drawnCards: ICard[] | undefined;
			if (drawCards > 0) {
				drawnCards = this.drawCard(player, drawCards);
			}
			this.updatePlayerHtmlPage(player, drawnCards);
		}

		this.storePreviouslyPlayedCard({card: card.displayName || card.name, shiny: card.shiny && !card.played});
		this.setTopCard(card, player);
		return true;
	}

	getPlayerSummary(player: Player): void {
		if (player.eliminated) return;
		this.updatePlayerHtmlPage(player);
	}
}

const commands: GameCommandDefinitions<CardMatching> = {
	play: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canPlay || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
			const targets = target.split(",");
			const cardName = targets[0].trim();
			targets.shift();

			const player = this.players[user.id];
			const cards = this.playerCards.get(player);
			if (!cards || !cards.length) return false;

			const index = this.getCardIndex(cardName, cards);
			if (index < 0) {
				const id = Tools.toId(cardName);
				if (!id) {
					user.say("You must specify a card.");
				} else {
					const pokemon = Dex.data.pokemonKeys.includes(id);
					const move = Dex.data.moveKeys.includes(id);
					if (pokemon) {
						user.say("You do not have [ " + Dex.getExistingPokemon(cardName).name + " ].");
					} else if (move) {
						user.say("You do not have [ " + Dex.getExistingMove(cardName).name + " ].");
					} else {
						user.say("'" + cardName + "' is not a valid Pokemon or move.");
					}
				}
				return false;
			}

			const card = cards[index];
			if (!card.action && !this.isPlayableCard(card, this.topCard)) {
				user.say(this.playableCardDescription || "You must play a card that matches color or a type with the top card or an " +
					"action card.");
				return false;
			}

			if (this.playCard(card as IPokemonCard, player, targets, cards) === false) return false;

			if (!cards.length) {
				player.frozen = true;
				if (this.finitePlayerCards) {
					this.sayUhtmlAuto(this.uhtmlBaseName + '-round', this.getMascotAndNameHtml() + "<br /><center><br />" +
						this.getTopCardHtml() + "</center>");
					this.end();
					return true;
				}
			} else if (this.finitePlayerCards && cards.length === this.minimumPlayedCards) {
				this.say(user.name + " has " + this.minimumPlayedCards + " card" + (this.minimumPlayedCards > 1 ? "s" : "") + " left!");
			}
			this.nextRound();
			return true;
		},
		aliases: ['pmplay'],
		pmGameCommand: true,
		eliminatedGameCommand: true,
	},
};

commands.summary = Tools.deepClone(Games.sharedCommands.summary);
commands.summary.aliases = ['cards', 'hand'];

const tests: GameFileTests<CardMatching> = {
	'it should properly create a deck': {
		test(game): void {
			addPlayers(game, 4);
			game.start();
			assert(game.deck.length);
		},
	},
	'it should create unique action cards': {
		test(game): void {
			addPlayers(game, 4);
			game.start();
			const actionCards = Object.keys(game.actionCards);
			for (const actionCard of actionCards) {
				const cardData = game.actionCards[actionCard];
				assert(cardData);
				const card = cardData.getCard(game);
				assert(card);
				assert(card !== cardData.getCard(game));
			}
		},
	},
};

export const game: IGameTemplateFile<CardMatching> = Object.assign(Tools.deepClone(cardGame), {
	category: 'luck' as GameCategory,
	commands: Object.assign(Tools.deepClone(cardGame.commands), commands),
	modes: undefined,
	modeProperties: undefined,
	tests: Object.assign({}, cardGame.tests, tests),
	variants: undefined,
});
