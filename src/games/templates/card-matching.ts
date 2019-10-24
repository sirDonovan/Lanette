import { ICommandDefinition } from '../../command-parser';
import { Player } from '../../room-activity';
import { Card, CardType, commands as cardCommands, IPokemonCard } from './card';

export abstract class CardMatching extends Card {
	actionCardAmount: number = 5;
	deckPool: IPokemonCard[] = [];
	inactivePlayerLimit: number = 3;
	lastPlayer: Player | null = null;
	maxCardRounds: number = 30;
	maxPlayers: number = 15;
	showPlayerCards: boolean = true;
	usesColors: boolean = true;

	// always truthy once the game starts
	topCard!: IPokemonCard;

	abstract arePlayableCards(cards: CardType[]): boolean;
	abstract isPlayableCard(cardA: CardType, cardB?: CardType): boolean;
	abstract onRemovePlayer(player: Player): void;
	abstract playActionCard(card: CardType, player: Player, targets: string[], cards: CardType[]): CardType[] | boolean;

	onInitialize() {
		this.createDeck();
	}

	createDeck() {
		const colorCounts: Dict<number> = {};
		const typeCounts: Dict<number> = {};
		if (!this.deckPool.length) this.createDeckPool();
		const pokedex = this.shuffle(this.deckPool);
		const deck: IPokemonCard[] = [];
		const minimumDeck = ((this.maxPlayers + 1) * this.options.cards);
		for (let i = 0; i < pokedex.length; i++) {
			const pokemon = pokedex[i];
			const multiType = pokemon.types.length > 1;
			if (this.colorsLimit && pokemon.color in colorCounts && colorCounts[pokemon.color] >= this.colorsLimit) continue;
			if (this.typesLimit) {
				if (pokemon.types[0] in typeCounts && typeCounts[pokemon.types[0]] >= this.typesLimit) continue;
				if (multiType && pokemon.types[1] in typeCounts && typeCounts[pokemon.types[1]] >= this.typesLimit) continue;
			}

			if (!(pokemon.color in colorCounts)) colorCounts[pokemon.color] = 0;
			colorCounts[pokemon.color]++;
			if (!(pokemon.types[0] in typeCounts)) typeCounts[pokemon.types[0]] = 0;
			typeCounts[pokemon.types[0]]++;
			if (multiType) {
				if (!(pokemon.types[1] in typeCounts)) typeCounts[pokemon.types[1]] = 0;
				typeCounts[pokemon.types[1]]++;
			}
			if (this.rollForShinyPokemon()) pokemon.shiny = true;
			deck.push(pokemon);
		}
		if (deck.length < minimumDeck) {
			this.createDeck();
			return;
		}
		const actionCards = Object.keys(this.actionCards);
		if (actionCards.length) {
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
			for (let i = 0; i < actionCards.length; i++) {
				const action = actionCards[i];
				const id = Tools.toId(actionCards[i]);
				const pokemon = id in Dex.data.pokedex;
				for (let i = 0; i < actionCardAmount; i++) {
					let card: CardType;
					if (pokemon) {
						card = Dex.getPokemonCopy(id);
					} else {
						card = Dex.getMoveCopy(id);
					}
					card.action = this.actionCards[action];
					// @ts-ignore
					deck.push(card);
				}
			}
		}
		this.deck = this.shuffle(deck);
	}

	showTopCard(firstPlayedShiny?: boolean) {
		const html = '<center>' + this.getCardChatHtml(this.topCard) + '</center>';
		if (firstPlayedShiny) {
			this.sayUhtml(this.uhtmlBaseName, "<div></div>");
			this.sayHtml(html);
		} else {
			this.sayUhtml(this.uhtmlBaseName, html);
		}
	}

	getTopCardText() {
		return "**" + this.topCard.species + "** (" + this.topCard.color + ", " + this.topCard.types.join("/") + ")";
	}

	repostTopCard() {
		if (!this.topCard) return;
		this.showTopCard();
	}

	getCardChatDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card) + '<br />' + this.getChatColorLabel(card);
	}

	getCardPmHtml(card: IPokemonCard): string {
		let html = '<center><div class="infobox">';
		if (card.id in this.actionCards) {
			html += card.name + '<br />';
			if (this.usesColors) {
				html += '<div style="display:inline-block;background-color:' + this.typeColorCodes['White']['background-color'] + ';background:' + this.typeColorCodes['White']['background'] + ';border-color:' + this.typeColorCodes['White']['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:' + this.detailLabelWidth + 'px;padding:1px;color:#333;text-shadow:1px 1px 1px #eee;text-transform: uppercase;text-align:center;font-size:8pt"><b>Action</b></div>';
				html += '<br />';
			}
			const description = (this.actionCardLabels[card.id] || this.actionCards[card.id]);
			let descriptionWidth = 'auto';
			if (description.length <= 8) descriptionWidth = this.detailLabelWidth + 'px';
			html += '<div style="display:inline-block;background-color:' + this.typeColorCodes['Black']['background-color'] + ';background:' + this.typeColorCodes['Black']['background'] + ';border-color:' + this.typeColorCodes['Black']['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:' + descriptionWidth + ';padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;text-align:center;font-size:8pt"><b>' + description + '</b></div>';
		} else {
			html += card.name + '<br />' + this.getCardPmDetails(card);
		}
		html += '</div></center>';
		return html;
	}

	getCardPmDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card) + "<br />" + this.getChatColorLabel(card);
	}

	getCardsPmHtml(cards: IPokemonCard[], player: Player): string {
		const html = [];
		for (let i = 0; i < cards.length; i++) {
			html.push('<div style="height:auto">' + this.getCardPmHtml(cards[i]) + '</div>');
		}
		return html.join("<br />");
	}

	onStart() {
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
		this.showTopCard();
		this.nextRound();
	}

	getPlayableCards(player: Player): string[] {
		const cards = this.playerCards.get(player);
		if (!cards) throw new Error(player.name + " has no hand");
		if (cards.length < this.minimumPlayedCards) return [];

		const playableCards: string[] = [];
		if (this.minimumPlayedCards === 1) {
			for (let i = 0; i < cards.length; i++) {
				const card = cards[i];
				if (card.action || this.isPlayableCard(card, this.topCard)) {
					playableCards.push(card.name);
				}
			}
		} else {
			for (let i = 0; i < cards.length; i++) {
				const card = cards[i];
				if (card.action) {
					playableCards.push(card.name);
					continue;
				}
				for (let i = 0; i < cards.length; i++) {
					const otherCard = cards[i];
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

	timeEnd() {
		this.timeEnded = true;
		this.say("Time's up!");
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

	onNextRound() {
		if (this.currentPlayer) this.lastPlayer = this.currentPlayer;
		this.currentPlayer = null;
		if (Date.now() - this.startTime! > this.timeLimit) return this.timeEnd();
		const remainingPlayers = this.getRemainingPlayerCount();
		if (!remainingPlayers) {
			this.end();
			return;
		}
		if (remainingPlayers === 1) return this.end();
		let player = this.getNextPlayer();
		if (!player) return;
		if (this.timeEnded) return;
		if (this.topCard.action === 'Skip') {
			this.say(player.name + "'s turn was skipped!");
			this.topCard.action = '';
			return this.nextRound();
		}
		const autoDraws = new Map<Player, CardType[]>();
		let hasCard = this.hasPlayableCard(player);
		let showTopCard = false;
		let drawCount = 0;
		while (!hasCard) {
			drawCount++;
			if (!showTopCard && this.topCard.action && this.topCard.action.startsWith('Draw')) showTopCard = true;
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
		// if (this.lastPlayer && drawCount > 5 && !this.lastPlayer.eliminated && this.id === 'bulbasaursuno') Games.unlockAchievement(this.room, this.lastPlayer, 'draw wizard', this);
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
		if (showTopCard) this.showTopCard();
		const text = player!.name + "'s turn!";
		this.on(text, () => {
			// left before text appeared
			if (player!.eliminated) {
				this.nextRound();
				return;
			}
			this.currentPlayer = player;
			this.timeout = setTimeout(() => {
				if (!player!.eliminated) {
					let inactivePlayerCount = this.inactivePlayerCounts.get(player!) || 0;
					inactivePlayerCount++;
					if (!(this.parentGame && this.parentGame.id === '1v1challenge') && inactivePlayerCount >= this.inactivePlayerLimit) {
						this.say(player!.name + " DQed for inactivity!");
						// nextRound() called in onRemovePlayer
						player!.eliminated = true;

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
			}, this.roundTime);
		});
		this.say(text);
	}

	onEnd() {
		for (const i in this.players) {
			if (this.players[i].eliminated || !this.players[i].frozen) continue;
			const player = this.players[i];
			this.addBits(player, 500);
			this.winners.set(player, 1);
		}

		this.announceWinners();
	}

	isCardPair(cardA: IPokemonCard, cardB: IPokemonCard): boolean {
		if (!cardA || !cardB || (cardA !== this.topCard && cardA.action) || (cardB !== this.topCard && cardB.action)) return false;
		return cardA.color === cardB.color || cardA.types.includes(cardB.types[0]) || (cardB.types.length > 1 && cardA.types.includes(cardB.types[1]));
	}

	playCard(card: IPokemonCard, player: Player, targets: string[], cards: CardType[]): CardType[] | boolean {
		let drawCards = 0;
		if (this.topCard.action && this.topCard.action.startsWith('Draw ')) drawCards = parseInt(this.topCard.action.split('Draw ')[1].trim());
		if (this.autoFillHands) {
			const remainingCards = cards.length - 1;
			if (remainingCards && (remainingCards + drawCards) < this.minimumPlayedCards) drawCards += this.minimumPlayedCards - remainingCards;
		}
		this.topCard = card;
		this.showTopCard(card.shiny && !card.played);
		// if (card.shiny && !card.played) Games.unlockAchievement(this.room, player, 'luck of the draw', this);
		card.played = true;
		cards.splice(cards.indexOf(card), 1);
		if (drawCards > 0) {
			if (!player.eliminated) this.drawCard(player, drawCards);
		} else {
			if (!player.eliminated && cards.length) this.dealHand(player);
		}
		return true;
	}

	getPlayerSummary(player: Player) {
		if (player.eliminated) return;
		this.dealHand(player);
	}
}

const cardMatchingCommands: Dict<ICommandDefinition<CardMatching>> = {
	play: {
		command(target, room, user) {
			if (!(user.id in this.players) || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
			const targets = target.split(",");
			const id = Tools.toId(targets[0]);
			if (!id) return false;
			const player = this.players[user.id];
			const cards = this.playerCards.get(player);
			if (!cards || !cards.length) return false;
			const index = this.getCardIndex(id, cards);
			if (index < 0) {
				if (Dex.data.pokedex[id]) {
					user.say("You don't have [ " + Dex.getExistingPokemon(id).species + " ].");
				} else if (Dex.data.moves[id]) {
					user.say("You don't have [ " + Dex.getExistingMove(id).name + " ].");
				} else {
					user.say("'" + targets[0] + "' isn't a valid Pokemon or move.");
				}
				return false;
			}
			const card = cards[index];
			if (!card.action && !this.isPlayableCard(card, this.topCard)) {
				user.say(this.playableCardDescription || "You must play a card that matches color or a type with the top card or an action card.");
				return false;
			}

			let playResult;
			if (card.action) {
				playResult = this.playActionCard(card, player, targets, cards);
			} else {
				playResult = this.playCard(card as IPokemonCard, player, targets, cards);
			}
			if (playResult === false) return false;

			// may be removed in playCard methods
			if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);
			if (!cards.length) {
				player.frozen = true;
				if (this.finitePlayerCards) {
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
	},
	cards: {
		command: Games.sharedCommands.summary.command,
	},
	hand: {
		command: Games.sharedCommands.summary.command,
	},
};

export const commands = Object.assign(cardCommands, cardMatchingCommands);
export let disabled = false;
