import type { Player } from '../../room-activity';
import { addPlayers, assert } from '../../test/test-tools';
import type {
	GameCategory, GameCommandDefinitions, GameCommandReturnType, GameFileTests, IGameAchievement, IGameTemplateFile
} from '../../types/games';
import { Card, game as cardGame } from './card';
import type { CardType, IPokemonCard } from './card';

interface IPreviouslyPlayedCard {
	card: string;
	detail?: string;
	shiny?: boolean;
}

export abstract class CardMatching extends Card {
	actionCardAmount: number = 5;
	awaitingCurrentPlayerCard: boolean = false;
	canPlay: boolean = false;
	deckPool: IPokemonCard[] = [];
	inactivePlayerLimit: number = 3;
	lastPlayer: Player | null = null;
	maxCardRounds: number = 30;
	maxPlayers: number = 15;
	previouslyPlayedCards: IPreviouslyPlayedCard[] = [];
	previouslyPlayedCardsAmount: number = 4;
	roundDrawAmount: number = 0;
	showPlayerCards: boolean = true;
	turnTimeBeforeHighlight: number = 15 * 1000;
	turnTimeAfterHighlight: number = 30 * 1000;
	usesColors: boolean = true;

	// always truthy once the game starts
	topCard!: IPokemonCard;

	drawAchievement?: IGameAchievement;
	drawAchievementAmount?: number;
	shinyCardAchievement?: IGameAchievement;

	abstract arePlayableCards(cards: CardType[]): boolean;
	abstract isPlayableCard(card: CardType, otherCard?: CardType): boolean;
	abstract onRemovePlayer(player: Player): void;
	abstract playActionCard(card: CardType, player: Player, targets: string[], cards: CardType[]): CardType[] | boolean;

	createDeck(): void {
		const colorCounts: Dict<number> = {};
		const typeCounts: Dict<number> = {};
		if (!this.deckPool.length) this.createDeckPool();
		const pokedex = this.shuffle(this.deckPool);
		const deck: IPokemonCard[] = [];
		const minimumDeck = ((this.maxPlayers + 1) * this.format.options.cards);
		outer:
		for (const pokemon of pokedex) {
			if (this.colorsLimit && pokemon.color in colorCounts && colorCounts[pokemon.color] >= this.colorsLimit) continue;
			if (this.typesLimit) {
				for (const type of pokemon.types) {
					if (type in typeCounts && typeCounts[type] >= this.typesLimit) continue outer;
				}
			}

			if (!(pokemon.color in colorCounts)) colorCounts[pokemon.color] = 0;
			colorCounts[pokemon.color]++;

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
				const pokemon = !!(Dex.getPokemon(action));
				for (let i = 0; i < actionCardAmount; i++) {
					let card: CardType;
					if (pokemon) {
						card = Dex.getPokemonCopy(action);
					} else {
						card = Dex.getMoveCopy(action);
					}
					card.action = this.actionCards[action];
					// @ts-expect-error
					deck.push(card);
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
				(opacityIncrement * i)) + '%;' + (card.shiny ? 'color: ' + Tools.hexColorCodes['Dark Yellow']['background-color'] : '') +
				'">' + cardText + '</div>';
		}
		return html;
	}

	getCardPmHtml(card: IPokemonCard, showPlayable: boolean): string {
		let html = '<center><div class="infobox">';
		if (showPlayable) {
			html += '<b>' + card.name + '</b>';
			if (card.action && (card.action.requiredTarget || card.action.requiredOtherCards)) {
				html += ' (play manually!)';
			} else {
				html += Client.getPmSelfButton(Config.commandCharacter + "pmplay " + card.name, "Play!");
			}
		} else {
			html += card.name;
		}
		html += '<br />';
		if (card.action) {
			if (this.usesColors) {
				html += '<div style="display:inline-block;background-color:' + Tools.hexColorCodes['White']['background-color'] +
					';background:' + Tools.hexColorCodes['White']['background'] + ';border-color:' +
					Tools.hexColorCodes['White']['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:' +
					this.detailLabelWidth + 'px;padding:1px;color:#333;text-shadow:1px 1px 1px #eee;text-transform: uppercase;' +
					'text-align:center;font-size:8pt"><b>Action</b></div>';
				html += '<br />';
			}
			const description = card.action.description;
			let descriptionWidth = 'auto';
			if (description.length <= 8) descriptionWidth = this.detailLabelWidth + 'px';
			html += '<div style="display:inline-block;background-color:' + Tools.hexColorCodes['Black']['background-color'] +
				';background:' + Tools.hexColorCodes['Black']['background'] + ';border-color:' +
				Tools.hexColorCodes['Black']['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:' +
				descriptionWidth + ';padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;text-align:center;' +
				'font-size:8pt"><b>' + description + '</b></div>';
		} else {
			html += this.getCardPmDetails(card);
		}
		html += '</div></center>';
		return html;
	}

	getCardPmDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card) + "<br />" + this.getChatColorLabel(card);
	}

	getCardsPmHtml(cards: IPokemonCard[], player: Player): string {
		let playableCards: string[] | undefined;
		if (this.minimumPlayedCards === 1 && this.awaitingCurrentPlayerCard && this.currentPlayer === player) {
			playableCards = this.getPlayableCards(player);
			for (let i = 0; i < playableCards.length; i++) {
				playableCards[i] = playableCards[i].split(',')[0];
			}
		}

		const html: string[] = [];
		for (const card of cards) {
			const playable = playableCards ? playableCards.includes(card.name) : false;
			html.push('<div style="height:auto">' + this.getCardPmHtml(card, playable) + '</div>');
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
		this.say("Now PMing cards!");
		for (const i in this.players) {
			const player = this.players[i];
			const cards = this.dealHand(player);
			this.playerCards.set(player, cards);
		}
		// may be set in tests
		if (!this.topCard) {
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
				let playable = false;
				if (card.action) {
					playable = card.action.requiredOtherCards ? cards.length - 1 >= card.action.requiredOtherCards : true;
				} else {
					playable = this.isPlayableCard(card, this.topCard);
				}
				if (playable) {
					playableCards.push(card.name);
				}
			}
		} else {
			for (const card of cards) {
				if (card.action && (!card.action.requiredOtherCards || cards.length - 1 >= card.action.requiredOtherCards)) {
					playableCards.push(card.name);
					continue;
				}
				for (const otherCard of cards) {
					if (card === otherCard || otherCard.action) continue;
					if (this.arePlayableCards([this.topCard, card, otherCard])) {
						playableCards.push(card.name + ", " + otherCard.name);
					}
				}
			}
		}
		return playableCards;
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
			this.end();
			return;
		}
		let player = this.getNextPlayer();
		if (!player || this.timeEnded) return;

		if (this.topCard.action && this.topCard.action.name === 'Skip') {
			this.say(player.name + "'s turn was skipped!");
			this.topCard.action = null;
			return this.nextRound();
		}
		const autoDraws = new Map<Player, CardType[]>();
		let hasCard = this.hasPlayableCard(player);
		let drawCount = 0;
		while (!hasCard) {
			drawCount++;
			const cards = this.drawCard(player, null, null, true);
			let drawnCards = autoDraws.get(player) || [];
			drawnCards = drawnCards.concat(cards);
			autoDraws.set(player, drawnCards);
			player = this.getNextPlayer();
			if (!player) {
				if (this.timeEnded) break;
				throw new Error("No player given by Game.getNextPlayer");
			}
			hasCard = this.hasPlayableCard(player);
		}

		if (this.drawAchievement && this.drawAchievementAmount && this.lastPlayer && drawCount >= this.drawAchievementAmount &&
			!this.lastPlayer.eliminated) {
			this.unlockAchievement(this.lastPlayer, this.drawAchievement);
		}

		if (this.timeEnded) return;
		if (autoDraws.size) {
			const names: string[] = [];
			autoDraws.forEach((cards, player) => {
				if (player.eliminated) return;
				this.dealHand(player, cards, "autodrawn");
				names.push("__" + player.name + "__");
			});
			this.say("Automatically drawing for: " + names.join(", "));
		}

		// needs to be set outside of on() for tests
		this.currentPlayer = player;

		const html = this.getNameSpan() + "<br /><center>" + this.getTopCardHtml() + "<br /><br /><b>" + player!.name + "</b>'s " +
			"turn!</center>";
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			// left before text appeared
			if (player!.eliminated) {
				this.nextRound();
				return;
			}

			this.awaitingCurrentPlayerCard = true;
			this.canPlay = true;
			this.dealHand(player!);

			this.timeout = setTimeout(() => {
				this.say(player!.name + " it is your turn!");

				this.timeout = setTimeout(() => {
					if (!player!.eliminated) {
						let inactivePlayerCount = this.inactivePlayerCounts.get(player!) || 0;
						inactivePlayerCount++;
						if (!(this.parentGame && this.parentGame.id === '1v1challenge') &&
							inactivePlayerCount >= this.inactivePlayerLimit) {
							this.say(player!.name + " DQed for inactivity!");
							// nextRound() called in onRemovePlayer
							this.eliminatePlayer(player!, "You did not play a card for " + this.inactivePlayerLimit + " rounds!");

							const remainingPlayers: Player[] = [];
							for (const i in this.players) {
								if (!this.players[i].eliminated) remainingPlayers.push(this.players[i]);
							}
							if (remainingPlayers.length === 1) remainingPlayers[0].frozen = true;

							this.onRemovePlayer(player!);
						} else {
							player!.useCommand('draw');
							this.inactivePlayerCounts.set(player!, inactivePlayerCount);
						}
					} else {
						this.nextRound();
					}
				}, this.turnTimeAfterHighlight);
			}, this.turnTimeBeforeHighlight);
		});

		this.sayUhtmlAuto(uhtmlName, html);
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
		if (!card || !otherCard || (card !== this.topCard && card.action) || (otherCard !== this.topCard && otherCard.action)) {
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

	playCard(card: IPokemonCard, player: Player, targets: string[], cards: CardType[]): CardType[] | boolean {
		card.displayName = player.name + "'s " + card.name;

		if (card.action) {
			return this.playActionCard(card, player, targets, cards);
		} else {
			return this.playRegularCard(card, player, targets, cards);
		}
	}

	playRegularCard(card: IPokemonCard, player: Player, targets: string[], cards: CardType[]): CardType[] | boolean {
		let drawCards = this.roundDrawAmount;
		if (this.topCard.action && this.topCard.action.name.startsWith('Draw ')) {
			drawCards = parseInt(this.topCard.action.name.split('Draw ')[1].trim());
		}
		if (this.autoFillHands) {
			const remainingCards = cards.length - 1;
			if (remainingCards && (remainingCards + drawCards) < this.minimumPlayedCards) {
				drawCards += this.minimumPlayedCards - remainingCards;
			}
		}
		this.awaitingCurrentPlayerCard = false;
		this.storePreviouslyPlayedCard({card: card.displayName || card.name, shiny: card.shiny && !card.played});
		this.setTopCard(card, player);
		cards.splice(cards.indexOf(card), 1);
		if (drawCards > 0) {
			if (!player.eliminated) this.drawCard(player, drawCards);
		} else {
			if (!player.eliminated && cards.length) this.dealHand(player);
		}
		return true;
	}

	getPlayerSummary(player: Player): void {
		if (player.eliminated) return;
		this.dealHand(player);
	}
}

const commands: GameCommandDefinitions<CardMatching> = {
	play: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canPlay || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
			const targets = target.split(",");
			const id = Tools.toId(targets[0]);
			if (!id) return false;
			const player = this.players[user.id];
			const cards = this.playerCards.get(player);
			if (!cards || !cards.length) return false;
			const index = this.getCardIndex(id, cards);
			if (index < 0) {
				const pokemon = Dex.getPokemon(id);
				const move = Dex.getMove(id);
				if (pokemon) {
					user.say("You do not have [ " + pokemon + " ].");
				} else if (move) {
					user.say("You do not have [ " + move.name + " ].");
				} else {
					user.say("'" + targets[0] + "' is not a valid Pokemon or move.");
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
					this.sayUhtmlAuto(this.uhtmlBaseName + '-round', this.getNameSpan() + "<br /><center>" + this.getNameSpan() +
						"<br />" + this.getTopCardHtml() + "</center>");
					this.end();
					return true;
				}
			} else if (this.finitePlayerCards && cards.length === this.minimumPlayedCards) {
				this.say(user.name + " has " + this.minimumPlayedCards + " card" + (this.minimumPlayedCards > 1 ? "s" : "") + " left!");
			}
			this.nextRound();
			return true;
		},
		chatOnly: true,
		eliminatedGameCommand: true,
	},
	pmplay: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canPlay || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
			this.players[user.id].useCommand('play', target);
			return true;
		},
		pmOnly: true,
	},
};

commands.summary = Tools.deepClone(Games.sharedCommands.summary);
commands.summary.aliases = ['cards', 'hand'];

const tests: GameFileTests<CardMatching> = {
	'it should properly create a deck': {
		test(game, format): void {
			addPlayers(game, 4);
			game.start();
			assert(game.deck.length);
		},
	},
};

export const game: IGameTemplateFile<CardMatching> = Object.assign(Tools.deepClone(cardGame), {
	category: 'card-matching' as GameCategory,
	commands: Object.assign(Tools.deepClone(cardGame.commands), commands),
	tests,
	variants: undefined,
});
