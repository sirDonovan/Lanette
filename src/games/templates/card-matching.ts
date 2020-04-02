import { ICommandDefinition } from '../../command-parser';
import { Player } from '../../room-activity';
import { GameCategory, IGameTemplateFile, IGameAchievement, GameCommandReturnType } from '../../types/games';
import { Card, CardType, game as cardGame, IPokemonCard } from './card';

export abstract class CardMatching extends Card {
	actionCardAmount: number = 5;
	awaitingCurrentPlayerCard: boolean = false;
	canPlay: boolean = false;
	deckPool: IPokemonCard[] = [];
	inactivePlayerLimit: number = 3;
	lastPlayer: Player | null = null;
	maxCardRounds: number = 30;
	maxPlayers: number = 15;
	showPlayerCards: boolean = true;
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
		for (let i = 0; i < pokedex.length; i++) {
			const pokemon = pokedex[i];
			if (this.colorsLimit && pokemon.color in colorCounts && colorCounts[pokemon.color] >= this.colorsLimit) continue;
			if (this.typesLimit) {
				for (let i = 0; i < pokemon.types.length; i++) {
					if (pokemon.types[i] in typeCounts && typeCounts[pokemon.types[i]] >= this.typesLimit) continue outer;
				}
			}

			if (!(pokemon.color in colorCounts)) colorCounts[pokemon.color] = 0;
			colorCounts[pokemon.color]++;

			for (let i = 0; i < pokemon.types.length; i++) {
				if (!(pokemon.types[i] in typeCounts)) typeCounts[pokemon.types[i]] = 0;
				typeCounts[pokemon.types[i]]++;
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

	showTopCard(firstPlayedShiny?: boolean): void {
		const html = '<center>' + this.getCardChatHtml(this.topCard) + '</center>';
		if (firstPlayedShiny) {
			this.sayUhtml(this.uhtmlBaseName, "<div></div>");
			this.sayHtml(html);
		} else {
			this.sayUhtml(this.uhtmlBaseName, html);
		}
	}

	getTopCardText(): string {
		return "**" + this.topCard.species + "** (" + this.topCard.color + ", " + this.topCard.types.join("/") + ")";
	}

	repostTopCard(): void {
		if (!this.topCard) return;
		this.showTopCard();
	}

	getCardChatDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card) + '<br />' + this.getChatColorLabel(card);
	}

	getCardPmHtml(card: IPokemonCard, showPlayable: boolean): string {
		let html = '<center><div class="infobox">';
		if (showPlayable) {
			html += '<b>' + card.name + '</b>';
			if (card.action && (card.action.requiredTarget || card.action.requiredOtherCards)) {
				html += ' (play manually!)';
			} else {
				html += ' <button class="button" name="send" value="/pm ' + Users.self.name + ', ' + Config.commandCharacter + 'pmplay ' + card.name + '">Play!</button>';
			}
		} else {
			html += card.name;
		}
		html += '<br />';
		if (card.action) {
			if (this.usesColors) {
				html += '<div style="display:inline-block;background-color:' + Tools.hexColorCodes['White']['background-color'] + ';background:' + Tools.hexColorCodes['White']['background'] + ';border-color:' + Tools.hexColorCodes['White']['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:' + this.detailLabelWidth + 'px;padding:1px;color:#333;text-shadow:1px 1px 1px #eee;text-transform: uppercase;text-align:center;font-size:8pt"><b>Action</b></div>';
				html += '<br />';
			}
			const description = card.action.description;
			let descriptionWidth = 'auto';
			if (description.length <= 8) descriptionWidth = this.detailLabelWidth + 'px';
			html += '<div style="display:inline-block;background-color:' + Tools.hexColorCodes['Black']['background-color'] + ';background:' + Tools.hexColorCodes['Black']['background'] + ';border-color:' + Tools.hexColorCodes['Black']['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:' + descriptionWidth + ';padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;text-align:center;font-size:8pt"><b>' + description + '</b></div>';
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
		for (let i = 0; i < cards.length; i++) {
			const card = cards[i];
			const playable = playableCards ? playableCards.includes(card.name) : false;
			html.push('<div style="height:auto">' + this.getCardPmHtml(card, playable) + '</div>');
		}
		return html.join("<br />");
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
			for (let i = 0; i < cards.length; i++) {
				const card = cards[i];
				if (card.action && (!card.action.requiredOtherCards || cards.length - 1 >= card.action.requiredOtherCards)) {
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
		let showTopCard = false;
		let drawCount = 0;
		while (!hasCard) {
			drawCount++;
			if (!showTopCard && this.topCard.action && this.topCard.action.name.startsWith('Draw')) showTopCard = true;
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

		if (this.drawAchievement && this.drawAchievementAmount && this.lastPlayer && drawCount >= this.drawAchievementAmount && !this.lastPlayer.eliminated) this.unlockAchievement(this.lastPlayer, this.drawAchievement);

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

		this.currentPlayer = player;
		const text = player!.name + "'s turn!";
		this.on(text, () => {
			// left before text appeared
			if (player!.eliminated) {
				this.nextRound();
				return;
			}

			this.awaitingCurrentPlayerCard = true;
			this.canPlay = true;
			this.dealHand(player!);

			this.timeout = setTimeout(() => {
				if (!player!.eliminated) {
					let inactivePlayerCount = this.inactivePlayerCounts.get(player!) || 0;
					inactivePlayerCount++;
					if (!(this.parentGame && this.parentGame.id === '1v1challenge') && inactivePlayerCount >= this.inactivePlayerLimit) {
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
			}, this.roundTime);
		});
		this.say(text);
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
		if (!card || !otherCard || (card !== this.topCard && card.action) || (otherCard !== this.topCard && otherCard.action)) return false;
		if (card.color === otherCard.color) return true;
		for (let i = 0; i < otherCard.types.length; i++) {
			if (card.types.includes(otherCard.types[i])) return true;
		}
		return false;
	}

	playCard(card: IPokemonCard, player: Player, targets: string[], cards: CardType[]): CardType[] | boolean {
		let drawCards = 0;
		if (this.topCard.action && this.topCard.action.name.startsWith('Draw ')) drawCards = parseInt(this.topCard.action.name.split('Draw ')[1].trim());
		if (this.autoFillHands) {
			const remainingCards = cards.length - 1;
			if (remainingCards && (remainingCards + drawCards) < this.minimumPlayedCards) drawCards += this.minimumPlayedCards - remainingCards;
		}
		this.awaitingCurrentPlayerCard = false;
		this.topCard = card;
		this.showTopCard(card.shiny && !card.played);
		if (card.shiny && !card.played && this.shinyCardAchievement) this.unlockAchievement(player, this.shinyCardAchievement);
		card.played = true;
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

const commands: Dict<ICommandDefinition<CardMatching>> = {
	play: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canPlay || !(user.id in this.players) || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
			const targets = target.split(",");
			const id = Tools.toId(targets[0]);
			if (!id) return false;
			const player = this.players[user.id];
			const cards = this.playerCards.get(player);
			if (!cards || !cards.length) return false;
			const index = this.getCardIndex(id, cards);
			if (index < 0) {
				if (Dex.data.pokedex[id]) {
					user.say("You do not have [ " + Dex.getExistingPokemon(id).species + " ].");
				} else if (Dex.data.moves[id]) {
					user.say("You do not have [ " + Dex.getExistingMove(id).name + " ].");
				} else {
					user.say("'" + targets[0] + "' is not a valid Pokemon or move.");
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
	pmplay: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canPlay || !(user.id in this.players) || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
			this.players[user.id].useCommand('play', target);
			return true;
		},
		pmOnly: true,
	},
	cards: {
		command: Games.sharedCommands.summary.command,
	},
	hand: {
		command: Games.sharedCommands.summary.command,
	},
};

export const game: IGameTemplateFile<CardMatching> = Object.assign(Tools.deepClone(cardGame), {
	category: 'card-matching' as GameCategory,
	commands: Object.assign(Tools.deepClone(cardGame.commands), commands),
});
