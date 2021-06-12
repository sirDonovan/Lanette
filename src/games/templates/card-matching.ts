import type { Player } from '../../room-activity';
import { addPlayers, assert } from '../../test/test-tools';
import type {
	GameCommandDefinitions, GameFileTests, IGameAchievement, IGameTemplateFile
} from '../../types/games';
import type { IPokemon } from '../../types/pokemon-showdown';
import type { IActionCardData, ICard, IPokemonCard } from './card';
import { Card, game as cardGame } from './card';

interface IPreviouslyPlayedCard {
	card: string;
	player: string;
	detail?: string;
	shiny?: boolean;
}

interface ITurnCards {
	action: ICard[];
	group: ICard[][];
	single: ICard[];
	unplayable: ICard[];
}

export abstract class CardMatching<ActionCardsType = Dict<IActionCardData>> extends Card<ActionCardsType> {
	actionCardAmount: number = 5;
	autoFillHands: boolean = false;
	canPlay: boolean = false;
	colorsLimit: number = 0;
	deckPool: IPokemonCard[] = [];
	eggGroupsLimit: number = 0;
	playerInactiveRoundLimit: number = 3;
	maxCardRounds: number = 30;
	maxPlayers: number = 15;
	minimumPlayedCards: number = 1;
	playableCardDescription: string = "You must play a card that matches color or a type with the top card.";
	previouslyPlayedCards: IPreviouslyPlayedCard[] = [];
	previouslyPlayedCardsAmount: number = 3;
	roundDrawAmount: number = 0;
	showPlayerCards: boolean = true;
	timeLimit: number = 25 * 60 * 1000;
	turnTimeLimit: number = 30 * 1000;
	turnChatWarningTime: number = 10 * 1000;
	turnPmWarningTime: number = 10 * 1000;
	typesLimit: number = 0;
	usesColors: boolean = false;

	// always truthy once the game starts
	declare topCard: IPokemonCard;

	maximumPlayedCards?: number;
	maxShownPlayableGroupSize?: number;
	skippedPlayerAchievement?: IGameAchievement;
	skippedPlayerAchievementAmount?: number;
	shinyCardAchievement?: IGameAchievement;

	abstract onRemovePlayer(player: Player): void;
	abstract playActionCard(card: ICard, player: Player, targets: string[], cards: ICard[]): boolean;

	filterForme(dex: typeof Dex, forme: IPokemon): boolean {
		const baseSpecies = dex.getPokemon(forme.baseSpecies);
		if (baseSpecies && (baseSpecies.color !== forme.color || !Tools.compareArrays(baseSpecies.types, forme.types)) &&
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
		const minimumDeck = (this.playerCount + 1) * this.format.options.cards;
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

		const actionCards = Object.keys(this.actionCards)
			// @ts-expect-error
			.filter(x => !(this.requiredGen && (this.actionCards[x] as IActionCardData).noOldGen));
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
		if (!this.previouslyPlayedCards.length) return "";

		let html = '<u>Previously played cards</u><br />';
		for (const previouslyPlayedCard of this.previouslyPlayedCards) {
			html += "<username>" + previouslyPlayedCard.player + "</username>'s " + previouslyPlayedCard.card +
				(previouslyPlayedCard.shiny ? " \u2605" : "") +
				(previouslyPlayedCard.detail ? " (" + previouslyPlayedCard.detail + ")" : "") + "<br />";
		}
		return html;
	}

	getPlayerTurnHtml(player: Player): string {
		const playerCards = this.playerCards.get(player)!;
		const turnCards = this.getTurnCards(player);
		let html = this.getCardsPrivateHtml(playerCards);

		const playButtons: string[] = [];
		for (const card of turnCards.action) {
			playButtons.push(this.getCardPlayButton(card, player));
		}

		for (const card of turnCards.group) {
			playButtons.push(this.getCardGroupPlayButton(card, player));
		}

		for (const card of turnCards.single) {
			playButtons.push(this.getCardPlayButton(card, player));
		}

		if (playButtons.length) {
			html += '<br /><b>Playable cards</b>' + (turnCards.group.length && this.maxShownPlayableGroupSize &&
				(!this.maximumPlayedCards || this.maxShownPlayableGroupSize < this.maximumPlayedCards) ? ' (there may be longer chains ' +
				'to play manually)' : '') + ':<br />' + playButtons.join("&nbsp;|&nbsp;");
		}

		return html;
	}

	getCardPrivateDetails(card: IPokemonCard): string {
		return "<b>Typing</b>:&nbsp;" + this.getChatTypeLabel(card) + "&nbsp;|&nbsp;<b>Color</b>:&nbsp;" + this.getChatColorLabel(card);
	}

	getCardPlayButton(card: ICard, player: Player): string {
		let html = '';
		if (card.action && card.action.getRandomTarget) {
			html += this.getMsgRoomButton("play " + card.action.getRandomTarget(this, this.playerCards.get(player)!),
				"Play <b>randomized " + card.name + "</b>", player.eliminated, player) + " (or manually)";
		} else {
			if (card.action && card.action.requiredTarget) {
				html += '<b>Play ' + card.name + ' manually!</b>';
			} else {
				html += this.getMsgRoomButton("play " + card.name, "Play <b>" + card.name + "</b>", player.eliminated, player);
			}
		}

		return html;
	}

	getCardGroupPlayButton(cards: ICard[], player: Player): string {
		const names = cards.map(x => x.name);
		return this.getMsgRoomButton("play " + names.join(", "), "Play " + Tools.joinList(names, "<b>", "</b>"), player.eliminated, player);
	}

	getCardPrivateHtml(card: ICard): string {
		let html = '<div class="infobox">';

		if (card.action) {
			html += '&nbsp;&nbsp;' + Dex.getItemIcon(Dex.getExistingItem("Poke Ball")) + '&nbsp;';
		} else {
			if (this.getDex().getData().pokemonKeys.includes(card.id)) {
				html += Dex.getPokemonIcon(Dex.getExistingPokemon(card.name));
			}
		}

		html += "<b>" + card.name + "</b>";

		const blackHex = Tools.getNamedHexCode('Black');

		html += "&nbsp;|&nbsp;";
		if (card.action) {
			html += '<b>Action</b>:&nbsp;' +
				Tools.getHexLabel(blackHex, '&nbsp;&nbsp;&nbsp;' + card.action.description + '&nbsp;&nbsp;&nbsp;', 'auto');
		} else {
			html += this.getCardPrivateDetails(card as IPokemonCard);
		}

		html += '</div>';
		return html;
	}

	getCardsPrivateHtml(cards: ICard[]): string {
		const html: string[] = [];
		for (const card of cards) {
			html.push('<div style="height:auto">' + this.getCardPrivateHtml(card) + '</div>');
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
			this.sendPlayerCards(this.players[i]);
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

		this.storePreviouslyPlayedCard({card: this.topCard.name, player: Users.self.name});
		this.nextRound();
	}

	isPlayableCard(card: ICard, otherCard: ICard): boolean {
		return this.isCardPair(card, otherCard);
	}

	arePlayableCards(cards: ICard[]): boolean {
		for (let i = 0; i < cards.length - 1; i++) {
			if (!this.isPlayableCard(cards[i], cards[i + 1])) {
				return false;
			}
		}

		return true;
	}

	getTurnCards(player: Player): ITurnCards {
		const action: ICard[] = [];
		const group: ICard[][] = [];
		const single: ICard[] = [];
		const unplayable: ICard[] = [];

		const cards = this.playerCards.get(player);
		if (!cards) throw new Error(player.name + " has no hand");

		if (this.minimumPlayedCards === 1 && this.maximumPlayedCards === 1) {
			for (const card of cards) {
				if (card.action) {
					const autoPlay = card.action.getAutoPlayTarget(this, cards);
					if (autoPlay) action.push(card);
				} else {
					if (this.isPlayableCard(card, this.topCard)) single.push(card);
				}
			}
		} else {
			const regularCards: IPokemonCard[] = [];
			for (const card of cards) {
				if (card.action) {
					const autoPlay = card.action.getAutoPlayTarget(this, cards);
					if (autoPlay) action.push(card);
				} else {
					regularCards.push(card as IPokemonCard);
				}
			}

			if (regularCards.length >= this.minimumPlayedCards) {
				let maximumPlayedCards = 0;
				if (!this.maximumPlayedCards) {
					if (this.maxShownPlayableGroupSize) maximumPlayedCards = this.maxShownPlayableGroupSize;
				} else {
					maximumPlayedCards = this.maximumPlayedCards;
					if (regularCards.length < maximumPlayedCards) maximumPlayedCards = regularCards.length;
				}

				const checked: Dict<boolean> = {};
				const combinations = Tools.getPermutations(regularCards, this.minimumPlayedCards, maximumPlayedCards);
				for (const combination of combinations) {
					if (combination.length === 1) {
						if (this.isPlayableCard(combination[0], this.topCard)) single.push(combination[0]);
					} else {
						if (this.arePlayableCards([this.topCard].concat(combination))) {
							const key = combination.map(x => x.name).sort().join(",");
							if (key in checked) continue;
							checked[key] = true;
							group.push(combination);
						}
					}
				}
			}
		}

		for (const card of cards) {
			if (action.includes(card) || single.includes(card)) continue;
			let inGroup = false;
			for (const cardGroup of group) {
				if (cardGroup.includes(card)) {
					inGroup = true;
					break;
				}
			}

			if (inGroup) continue;

			unplayable.push(card);
		}

		return {
			action,
			group,
			single,
			unplayable,
		};
	}

	hasPlayableCard(splitCards: ITurnCards): boolean {
		if (splitCards.action.length) return true;
		if (splitCards.group.length) return true;
		if (splitCards.single.length) return true;
		return false;
	}

	autoPlay(player: Player, splitCards: ITurnCards): void {
		const playerCards = this.playerCards.get(player)!;

		const autoPlayOptions: string[] = [];
		for (const card of splitCards.action) {
			autoPlayOptions.push(card.action!.getAutoPlayTarget(this, playerCards)!);
		}
		for (const group of splitCards.group) {
			autoPlayOptions.push(group.map(x => x.name).join(", "));
		}
		for (const card of splitCards.single) {
			autoPlayOptions.push(card.name);
		}

		let autoPlay = '';
		if (autoPlayOptions.length) autoPlay = this.sampleOne(autoPlayOptions);

		this.say(player.name + " did not play a card and has been eliminated from the game!" + (autoPlay ? " Auto-playing: " +
			autoPlay : ""));
		this.eliminatePlayer(player);
		this.sendPlayerCards(player);

		if (autoPlay) {
			player.useCommand('play', autoPlay);
		} else {
			this.nextRound();
		}
	}

	onNextRound(): void {
		this.canPlay = false;
		if (this.currentPlayer) {
			this.lastPlayer = this.currentPlayer;
			this.currentPlayer = null;
		}

		if (this.getRemainingPlayerCount() <= 1) {
			if (this.finitePlayerCards) {
				const finalPlayer = this.getFinalPlayer();
				if (finalPlayer) finalPlayer.metWinCondition = true;
			}
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
		const eliminatedText = "does not have a card to play and has been eliminated from the game!";
		let turnCards = this.getTurnCards(player);
		let hasPlayableCard = this.hasPlayableCard(turnCards);
		let skippedPlayerCount = 0;
		let finalPlayer = false;
		while (!hasPlayableCard) {
			if (this.startingLives) {
				const lives = this.addLives(player, -1);
				if (!lives) {
					skippedPlayerCount++;
					this.eliminatePlayer(player);
					if (this.getRemainingPlayerCount() === 1) {
						finalPlayer = true;
						break;
					}
					this.say(player.name + " " + eliminatedText);
				} else {
					this.say(player.name + " does not have a card to play and has lost a life!");
				}
			} else {
				skippedPlayerCount++;
			}

			if (this.finitePlayerCards) {
				const cards = this.drawCard(player);
				let drawnCards = autoDraws.get(player) || [];
				drawnCards = drawnCards.concat(cards);
				autoDraws.set(player, drawnCards);
			}

			player = this.getNextPlayer();
			if (!player) {
				if (this.timeEnded) break; // eslint-disable-line @typescript-eslint/no-unnecessary-condition
				throw new Error("No player given by Game.getNextPlayer");
			}
			turnCards = this.getTurnCards(player);
			hasPlayableCard = this.hasPlayableCard(turnCards);
		}

		if (this.skippedPlayerAchievement && this.skippedPlayerAchievementAmount && this.lastPlayer && !this.lastPlayer.eliminated &&
			skippedPlayerCount >= this.skippedPlayerAchievementAmount) {
			this.unlockAchievement(this.lastPlayer, this.skippedPlayerAchievement);
		}

		if (this.timeEnded) return; // eslint-disable-line @typescript-eslint/no-unnecessary-condition

		if (autoDraws.size) {
			const names: string[] = [];
			autoDraws.forEach((cards, autoDrawPlayer) => {
				if (autoDrawPlayer.eliminated) return;
				this.sendPlayerCards(autoDrawPlayer, cards);
				names.push("__" + autoDrawPlayer.name + "__");
			});
			this.say("Automatically drawing for: " + names.join(", "));
		}

		// needs to be set outside of on() for tests
		this.currentPlayer = player;
		this.awaitingCurrentPlayerCard = true;

		const html = this.getMascotAndNameHtml() + "<br /><center>" + this.getTopCardHtml() + "<br /><b><username>" + player!.name +
			"</username></b>'s turn!</center>";
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			if (finalPlayer) {
				this.say(player!.name + " " + eliminatedText);
				this.end();
				return;
			}

			// left before text appeared
			if (player!.eliminated) {
				if (this.topCard.action && this.topCard.action.drawCards) {
					delete this.topCard.action;
				}

				this.nextRound();
				return;
			}

			this.canPlay = true;
			this.sendPlayerCards(player!);
			player!.sendHighlightPage("It is your turn!");

			if (this.parentGame && this.parentGame.onChildPlayerTurn) this.parentGame.onChildPlayerTurn(player!);

			this.timeout = setTimeout(() => {
				if (player!.sentPrivateHtml) this.say(player!.name + " it is your turn!");

				this.timeout = setTimeout(() => {
					const timeAfterWarnings = this.turnTimeLimit - this.turnChatWarningTime - this.turnPmWarningTime;
					const timeAfterWarningString = Tools.toDurationString(timeAfterWarnings);
					player!.say("There " + (timeAfterWarningString.endsWith("s") ? "are" : "is") + " only " + timeAfterWarningString +
						" of your turn left!");

					this.timeout = setTimeout(() => {
						if (!player!.eliminated) {
							if (this.finitePlayerCards) {
								if (this.addPlayerInactiveRound(player!)) {
									this.say(player!.name + " DQed for inactivity!");
									// nextRound() called in onRemovePlayer
									this.eliminatePlayer(player!);
									this.sendPlayerCards(player!);

									const newFinalPlayer = this.getFinalPlayer();
									if (newFinalPlayer) newFinalPlayer.metWinCondition = true;

									this.onRemovePlayer(player!);
								} else {
									player!.useCommand('draw');
								}
							} else {
								this.autoPlay(player!, turnCards);
							}
						} else {
							this.nextRound();
						}
					}, timeAfterWarnings);
				}, this.turnPmWarningTime);
			}, this.turnChatWarningTime);
		});

		if (!skippedPlayerCount && this.round === currentRound) {
			this.sayUhtmlAuto(uhtmlName, html);
		} else {
			this.sayUhtml(uhtmlName, html);
		}
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated || (this.finitePlayerCards && !this.players[i].metWinCondition)) continue;
			const player = this.players[i];
			this.addBits(player, 500);
			this.winners.set(player, 1);
		}

		this.announceWinners();
	}

	isCardPair(card: ICard, otherCard: ICard): boolean {
		if ((card !== this.topCard && card.action) || (otherCard !== this.topCard && otherCard.action)) {
			return false;
		}

		if (this.isPokemonCard(card) && this.isPokemonCard(otherCard)) {
			if (card.color === otherCard.color) return true;
			for (const type of otherCard.types) {
				if (card.types.includes(type)) return true;
			}
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

	playCard(card: ICard, player: Player, targets: string[], cards: ICard[]): boolean {
		let played = false;
		if (card.action) {
			played = this.playActionCard(card, player, targets, cards);
		} else {
			played = this.playRegularCard(card as IPokemonCard, player, targets, cards);
		}

		if (played) {
			this.lastPlayer = this.currentPlayer;
			this.currentPlayer = null;
		}

		return played;
	}

	playRegularCard(card: IPokemonCard, player: Player, targets: string[], cards: ICard[]): boolean {
		const playedCards: ICard[] = [card];
		for (const target of targets) {
			const id = Tools.toId(target);
			const index = this.getCardIndex(id, cards, playedCards);
			if (index < 0) {
				const pokemon = Dex.getPokemon(id);
				if (pokemon) {
					player.say("You do not have [ " + pokemon.name + " ].");
				} else {
					player.say(CommandParser.getErrorText(['invalidPokemon', target]));
				}
				return false;
			}
			if (playedCards.includes(cards[index])) {
				player.say("You can only play a card once per turn.");
				return false;
			}
			playedCards.push(cards[index]);
		}

		if (this.maximumPlayedCards && playedCards.length > this.maximumPlayedCards) {
			player.say("You cannot play more than " + this.maximumPlayedCards + " card" + (this.maximumPlayedCards > 1 ? "s" : "") + ".");
			return false;
		}

		if (playedCards.length < this.minimumPlayedCards) {
			player.say("You must play at least " + this.minimumPlayedCards + " card" + (this.minimumPlayedCards > 1 ? "s" : "") + ".");
			return false;
		}

		const names: string[] = [];
		if (playedCards.length === 1) {
			if (!this.isPlayableCard(card, this.topCard)) {
				player.say(this.playableCardDescription || "You must play a card that matches color or a type with the top card or an " +
					"action card.");
				return false;
			}
		} else {
			if (!this.arePlayableCards(playedCards)) {
				player.say("All played cards must pair one after the other.");
				return false;
			}

			card = playedCards[playedCards.length - 1] as IPokemonCard;
			for (const playedCard of playedCards) {
				if (playedCard !== card) names.push(playedCard.name);
				cards.splice(cards.indexOf(playedCard), 1);
			}
		}

		if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);

		let drawCards = this.roundDrawAmount;
		if (this.topCard.action && this.topCard.action.drawCards) {
			drawCards = this.topCard.action.drawCards;
			delete this.topCard.action;
		}

		if (this.autoFillHands) {
			const remainingCards = cards.length;
			if (remainingCards && (remainingCards + drawCards) < this.minimumPlayedCards) {
				drawCards += this.minimumPlayedCards - remainingCards;
			}
		}

		this.awaitingCurrentPlayerCard = false;

		this.storePreviouslyPlayedCard({card: card.name + (names.length ? " ( + " + names.join(" + ") + ")" : ""),
			player: player.name, shiny: card.shiny && !card.played});
		this.setTopCard(card, player);

		if (!player.eliminated) {
			let drawnCards: ICard[] | undefined;
			if (drawCards > 0) {
				drawnCards = this.drawCard(player, drawCards);
			}
			this.sendPlayerCards(player, drawnCards);
		}

		return true;
	}

	getPlayerSummary(player: Player): void {
		if (player.eliminated) return;
		this.sendPlayerCards(player);
	}

	botChallengeTurn(botPlayer: Player): void {
		const cards = this.playerCards.get(botPlayer);
		if (!cards) throw new Error(botPlayer.name + " has no hand");

		const turnCards = this.getTurnCards(botPlayer);
		let play: string | undefined;
		if (turnCards.group.length) {
			play = this.sampleOne(turnCards.group).map(x => x.name).join(", ");
		} else if (turnCards.single.length) {
			play = this.sampleOne(turnCards.single).name;
		} else if (turnCards.action.length) {
			play = this.sampleOne(turnCards.action).action!.getAutoPlayTarget(this, cards);
		}

		if (!play) throw new Error(botPlayer.name + " does not have a card to play");

		this.botTurnTimeout = setTimeout(() => {
			const text = Config.commandCharacter + "play " + play;
			this.on(text, () => {
				botPlayer.useCommand("play", play);
			});
			this.say(text);
		}, this.sampleOne([1000, 1500, 2000]));
	}
}

const commands: GameCommandDefinitions<CardMatching> = {
	play: {
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
					if (Dex.getData().pokemonKeys.includes(id)) {
						user.say("You do not have [ " + Dex.getExistingPokemon(cardName).name + " ].");
					} else if (Dex.getData().moveKeys.includes(id)) {
						user.say("You do not have [ " + Dex.getExistingMove(cardName).name + " ].");
					} else {
						user.say("'" + cardName + "' is not a valid Pokemon or move.");
					}
				}
				return false;
			}

			const card = cards[index];
			if (!this.playCard(card as IPokemonCard, player, targets, cards)) return false;

			if (!cards.length) {
				player.frozen = true;
				player.metWinCondition = true;
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
		eliminatedGameCommand: true,
	},
};

commands.summary = Tools.deepClone(Games.getSharedCommands().summary);
commands.summary.aliases = ['cards', 'hand'];

const tests: GameFileTests<CardMatching> = {
	'it should properly create a deck': {
		test(game): void {
			addPlayers(game, game.maxPlayers || 15);
			game.start();
			assert(game.deck.length);
			assert(game.currentPlayer);
			assert(game.awaitingCurrentPlayerCard);
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
	challengeOptions: {
		botchallenge: {
			enabled: true,
		},
		onevsone: {
			enabled: true,
		},
	},
	commands: Object.assign(Tools.deepClone(cardGame.commands), commands),
	modes: undefined,
	modeProperties: undefined,
	tests: Object.assign({}, cardGame.tests, tests),
	variants: undefined,
});
