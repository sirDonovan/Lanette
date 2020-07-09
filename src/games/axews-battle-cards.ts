import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { IPokemon, IMove, IMoveCopy } from "../types/dex";
import type { AchievementsDict, IGameFile } from "../types/games";
import type { User } from "../users";
import type { ICard, IActionCardData, IMoveCard, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

const types: Dict<string> = {};

const trumpCardEliminations = 5;
const achievements: AchievementsDict = {
	"luckofthedraw": {name: "Luck of the Draw", type: 'shiny', bits: 1000, repeatBits: 250, description: 'draw and play a shiny card'},
	"trumpcard": {name: "Trump Card", type: 'special', bits: 1000, description: 'play a card that eliminates ' +
		trumpCardEliminations + ' or more players'},
};

type ActionCardsType = Dict<IActionCardData<AxewsBattleCards>>;

class AxewsBattleCards extends CardMatching<ActionCardsType> {
	actionCards: ActionCardsType = {
		"soak": {
			name: "Soak",
			description: "Make pure Water type",
			getAutoPlayTarget(game, hand) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.types.length === 1 && game.topCard.types[0] === 'Water') {
					if (player) player.say(game.topCard.name + " is already pure Water-type!");
					return false;
				}
				return true;
			},
		},
		"trickortreat": {
			name: "Trick-or-Treat",
			description: "Add Ghost type",
			getAutoPlayTarget(game, hand) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.types.includes('Ghost')) {
					if (player) {
						player.say(game.topCard.name + " is already " + (game.topCard.types.length > 1 ? "part " : "") + "Ghost-type!");
					}
					return false;
				}

				return true;
			},
		},
		"forestscurse": {
			name: "Forest's Curse",
			description: "Add Grass type",
			getAutoPlayTarget(game, hand) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.types.includes('Grass')) {
					if (player) {
						player.say(game.topCard.name + " is already " + (game.topCard.types.length > 1 ? "part " : "") + "Grass-type!");
					}
					return false;
				}

				return true;
			},
		},
		"magicpowder": {
			name: "Magic Powder",
			description: "Make pure Psychic type",
			getAutoPlayTarget(game, hand) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.types.length === 1 && game.topCard.types[0] === 'Psychic') {
					if (player) player.say(game.topCard.name + " is already pure Psychic-type!");
					return false;
				}
				return true;
			},
		},
		"batonpass": {
			name: "Baton Pass",
			description: "Replace top card & draw 2",
			requiredTarget: true,
			getRandomTarget(game, hand) {
				const cards = game.shuffle(hand);
				for (const card of cards) {
					if (!card.action && this.isPlayableTarget(game, [card.name])) {
						return this.name + ", " + card.name;
					}
				}
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				const id = Tools.toId(targets[0]);
				if (!id) {
					if (player) player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [Pokemon]``");
					return false;
				}

				const pokemon = Dex.getPokemon(targets[0]);
				if (!pokemon) {
					if (player) player.say(CommandParser.getErrorText(['invalidPokemon', targets[0]]));
					return false;
				}

				if (hand) {
					let hasCard = false;
					for (const card of hand) {
						if (card.name === pokemon.name) {
							hasCard = true;
							break;
						}
					}

					if (!hasCard) {
						if (player) player.say("You do not have [ " + pokemon.name + " ].");
						return false;
					}
				}

				if (game.topCard.name === pokemon.name) {
					if (player) player.say("The top card is already " + pokemon.name + ".");
					return false;
				}

				return true;
			},
		},
		"allyswitch": {
			name: "Ally Switch",
			description: "Swap with top card & draw 1",
			requiredTarget: true,
			getRandomTarget(game, hand) {
				const cards = game.shuffle(hand);
				for (const card of cards) {
					if (!card.action && this.isPlayableTarget(game, [card.name])) {
						return this.name + ", " + card.name;
					}
				}
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				const id = Tools.toId(targets[0]);
				if (!id) {
					if (player) player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [Pokemon]``");
					return false;
				}

				const pokemon = Dex.getPokemon(targets[0]);
				if (!pokemon) {
					if (player) player.say(CommandParser.getErrorText(['invalidPokemon', targets[0]]));
					return false;
				}

				if (hand) {
					let hasCard = false;
					for (const card of hand) {
						if (card.name === pokemon.name) {
							hasCard = true;
							break;
						}
					}

					if (!hasCard) {
						if (player) player.say("You do not have [ " + pokemon.name + " ].");
						return false;
					}
				}

				if (game.topCard.name === pokemon.name) {
					if (player) player.say("The top card is already " + pokemon.name + ".");
					return false;
				}

				return true;
			},
		},
		"conversion": {
			name: "Conversion",
			description: "Change to 1 type",
			requiredTarget: true,
			getRandomTarget(game, hand) {
				let targets: string[] = [Dex.getExistingType(game.sampleOne(Dex.data.typeKeys)).name];
				while (!this.isPlayableTarget(game, targets)) {
					targets = [Dex.getExistingType(game.sampleOne(Dex.data.typeKeys)).name];
				}

				return this.name + ", " + targets[0];
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				const type = Tools.toId(targets[0]);
				if (!type) {
					if (player) player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [type]``");
					return false;
				}

				if (!(type in types)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[0]]));
					return false;
				}

				if (game.topCard.types.length === 1 && types[type] === game.topCard.types[0]) {
					if (player) player.say("The top card is already " + types[type] + " type.");
					return false;
				}

				return true;
			},
		},
		"conversion2": {
			name: "Conversion 2",
			description: "Change to 2 types",
			requiredTarget: true,
			getRandomTarget(game, hand) {
				let types = game.sampleMany(Dex.data.typeKeys, 2).map(x => Dex.getExistingType(x).name);
				while (!this.isPlayableTarget(game, types)) {
					types = game.sampleMany(Dex.data.typeKeys, 2).map(x => Dex.getExistingType(x).name);
				}

				return this.name + ", " + types.join(", ");
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				const type1 = Tools.toId(targets[0]);
				const type2 = Tools.toId(targets[1]);
				if (!type1 || !type2) {
					if (player) player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [type 1], [type 2]``");
					return false;
				}

				if (!(type1 in types)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[0]]));
					return false;
				}

				if (!(type2 in types)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[1]]));
					return false;
				}

				if (type1 === type2) {
					if (player) player.say("Please enter two unique types.");
					return false;
				}

				if (game.topCard.types.length === 2) {
					const typesList = [types[type1], types[type2]];
					if (game.topCard.types.slice().sort().join(",") === typesList.sort().join(",")) {
						if (player) player.say("The top card already " + typesList.join("/") + " type.");
						return false;
					}
				}

				return true;
			},
		},
		"conversionz": {
			name: "Conversion Z",
			description: "Change to 3 types",
			requiredTarget: true,
			getRandomTarget(game, hand) {
				let types = game.sampleMany(Dex.data.typeKeys, 3).map(x => Dex.getExistingType(x).name);
				while (!this.isPlayableTarget(game, types)) {
					types = game.sampleMany(Dex.data.typeKeys, 3).map(x => Dex.getExistingType(x).name);
				}

				return this.name + ", " + types.join(", ");
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				const type1 = Tools.toId(targets[0]);
				const type2 = Tools.toId(targets[1]);
				const type3 = Tools.toId(targets[2]);
				if (!type1 || !type2 || !type3) {
					if (player) {
						player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [type 1], [type 2], [type 3]``");
					}
					return false;
				}

				if (!(type1 in types)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[0]]));
					return false;
				}

				if (!(type2 in types)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[1]]));
					return false;
				}

				if (!(type3 in types)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[2]]));
					return false;
				}

				if (type1 === type2 || type1 === type3 || type2 === type3) {
					if (player) player.say("Please enter three unique types.");
					return false;
				}

				if (game.topCard.types.length === 2) {
					const typesList = [types[type1], types[type2], types[type3]];
					if (game.topCard.types.slice().sort().join(",") === typesList.sort().join(",")) {
						if (player) player.say("The top card already " + typesList.join("/") + " type.");
						return false;
					}
				}

				return true;
			},
		},
		"transform": {
			name: "Transform",
			description: "Change the top card",
			requiredTarget: true,
			getRandomTarget(game, hand) {
				let targets = [game.sampleOne(game.deckPool).name];
				while (!this.isPlayableTarget(game, targets)) {
					targets = [game.sampleOne(game.deckPool).name];
				}
				return this.name + ", " + targets[0];
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				const id = Tools.toId(targets[0]);
				if (!id) {
					if (player) player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [Pokemon]``");
					return false;
				}

				const pokemon = Dex.getPokemon(targets[0]);
				if (!pokemon) {
					if (player) player.say(CommandParser.getErrorText(['invalidPokemon', targets[0]]));
					return false;
				}

				let deckHasSpecies = false;
				for (const card of game.deckPool) {
					if (card.name === pokemon.name) {
						deckHasSpecies = true;
						break;
					}
				}

				if (!deckHasSpecies) {
					if (player) player.say(pokemon.name + " is not playable in this game.");
					return false;
				}

				if (game.topCard.name === pokemon.name) {
					if (player) player.say("The top card is already " + pokemon.name + ".");
					return false;
				}

				return true;
			},
		},
		"protect": {
			name: "Protect",
			description: "Skip your turn",
			getAutoPlayTarget() {
				return this.name;
			},
			isPlayableTarget() {
				return true;
			},
		},
		"teeterdance": {
			name: "Teeter Dance",
			description: "Shuffle the turn order",
			getAutoPlayTarget() {
				return this.name;
			},
			isPlayableTarget() {
				return true;
			},
		},
		"topsyturvy": {
			name: "Topsy-Turvy",
			description: "Reverse the turn order",
			getAutoPlayTarget() {
				return this.name;
			},
			isPlayableTarget() {
				return true;
			},
		},
	};
	finitePlayerCards = false;
	lives = new Map<Player, number>();
	maxPlayers = 20;
	playableCardDescription = "You must play a card that is super-effective against the top card";
	roundDrawAmount: number = 1;
	shinyCardAchievement = achievements.luckofthedraw;
	showPlayerCards = false;
	startingLives: number = 1;
	usesColors = false;

	static loadData(room: Room | User): void {
		for (const key of Dex.data.typeKeys) {
			const type = Dex.getExistingType(key);
			types[type.id] = type.name;
			types[type.id + 'type'] = type.name;
		}
	}

	onRemovePlayer(player: Player): void {
		const index = this.playerOrder.indexOf(player);
		if (index > -1) this.playerOrder.splice(index, 1);
		if (player === this.currentPlayer) {
			this.nextRound();
		}
	}

	filterPoolItem(pokemon: IPokemon): boolean {
		if (this.hasNoWeaknesses(pokemon)) return true;
		return false;
	}

	createDeck(): void {
		const weaknessCounts: Dict<number> = {};
		if (!this.deckPool.length) this.createDeckPool();
		const deckPool = this.shuffle(this.deckPool);
		const deck: ICard[] = [];
		const minimumDeck = ((this.maxPlayers + 1) * this.format.options.cards);
		for (const card of deckPool) {
			if (!this.usesActionCards && card.types.join("") === "Normal") continue;

			const weaknesses = Dex.getWeaknesses(Dex.getExistingPokemon(card.name)).join(",");
			if (weaknesses in weaknessCounts && weaknessCounts[weaknesses] >= this.format.options.cards) continue;
			if (!(weaknesses in weaknessCounts)) weaknessCounts[weaknesses] = 0;
			weaknessCounts[weaknesses]++;

			if (this.rollForShinyPokemon()) card.shiny = true;
			deck.push(card);
		}

		if (deck.length < minimumDeck) {
			this.createDeck();
			return;
		}

		const actionCardKeysLength = Object.keys(this.actionCards).length;
		if (actionCardKeysLength && this.usesActionCards) {
			let actionCardAmount = this.actionCardAmount;
			let totalActionCards = actionCardKeysLength * actionCardAmount;
			let maxPercentage = 0.15;
			const lowestPercentage = actionCardKeysLength / (deck.length + totalActionCards);
			if (maxPercentage < lowestPercentage) maxPercentage = lowestPercentage;
			while (actionCardAmount && totalActionCards / (deck.length + totalActionCards) > maxPercentage) {
				actionCardAmount--;
				totalActionCards = actionCardKeysLength * actionCardAmount;
			}
			if (!actionCardAmount) {
				this.createDeck();
				return;
			}
			this.actionCardAmount = actionCardAmount;
			for (const i in this.actionCards) {
				const actionCard = this.actionCards[i];
				for (let i = 0; i < actionCardAmount; i++) {
					let move: IMoveCopy;
					if (actionCard.name === "Conversion Z") {
						move = Dex.getMoveCopy("Conversion 2");
						move.name = "Conversion Z";
						move.id = "conversionz";
					} else {
						move = Dex.getMoveCopy(actionCard.name);
					}

					const card = this.moveToCard(move);
					// @ts-expect-error
					card.action = actionCard;
					deck.push(card);
				}
			}
		}

		this.deck = this.shuffle(deck);
	}

	getCardChatDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card);
	}

	getCardPmDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card);
	}

	hasNoWeaknesses(pokemon: IPokemon): boolean {
		let noWeaknesses = true;
		for (const key of Dex.data.typeKeys) {
			const type = Dex.getExistingType(key).name;
			if (!Dex.isImmune(type, pokemon) && Dex.getEffectiveness(type, pokemon) > 0) {
				noWeaknesses = false;
				break;
			}
		}
		return noWeaknesses;
	}

	isStaleTopCard(): boolean {
		return this.hasNoWeaknesses(Dex.getExistingPokemon(this.topCard.name));
	}

	checkTopCardStaleness(message?: string): void {
		if (this.isStaleTopCard()) {
			this.say(message || this.topCard.name + " no longer has any weaknesses!");
			let topCard = this.getCard();
			while (topCard.action) {
				topCard = this.getCard();
			}
			this.topCard = topCard as IPokemonCard;
		}
	}

	isPlayableCard(card: IPokemonCard, otherCard?: IPokemonCard): boolean {
		if (card === this.topCard) return false;
		if (!otherCard) otherCard = this.topCard;

		const pokemon = Dex.getExistingPokemon(otherCard.name);
		let valid = false;
		for (const type of card.types) {
			if (Dex.isImmune(type, pokemon)) {
				continue;
			} else {
				const effectiveness = Dex.getEffectiveness(type, pokemon);
				if (effectiveness > 0) {
					valid = true;
					break;
				}
			}
		}

		return valid;
	}

	arePlayableCards(cards: IPokemonCard[]): boolean {
		return true;
	}

	timeEnd(): void {
		this.say("Time is up!");
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

		const eliminatedText = "does not have a card to play and has been eliminated from the game!";
		let playableCards = this.getPlayableCards(player);
		let eliminateCount = 0;
		let finalPlayer = false;
		while (!playableCards.length) {
			let lives = this.lives.get(player)!;
			lives--;
			this.lives.set(player, lives);
			if (!lives) {
				eliminateCount++;
				this.eliminatePlayer(player, "You do not have a card to play!");
				if (this.getRemainingPlayerCount() === 1) {
					finalPlayer = true;
					break;
				}
				this.say(player.name + " " + eliminatedText);
			} else {
				this.say(player.name + " does not have a card to play and has lost a life!");
				player.say("You do not have a card to play! You have " + lives + " " +
					(lives === 1 ? "life" : "lives") + " remaining!");
			}

			player = this.getNextPlayer();
			if (!player) {
				if (this.timeEnded) break;
				throw new Error("No player given by Game.getNextPlayer");
			}
			playableCards = this.getPlayableCards(player);
		}

		if (this.lastPlayer && eliminateCount >= trumpCardEliminations && !this.lastPlayer.eliminated) {
			this.unlockAchievement(this.lastPlayer, achievements.trumpcard!);
		}

		if (this.timeEnded) return;

		// needs to be set outside of on() for tests
		this.currentPlayer = player;

		const html = this.getNameSpan() + "<br /><center>" + this.getTopCardHtml() + "<br /><br /><b>" + player!.name + "</b>'s " +
			"turn!</center>";
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			if (finalPlayer) {
				this.say(player!.name + " " + eliminatedText);
				this.end();
				return;
			}

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
						this.autoPlay(player!, playableCards);
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
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			this.winners.set(player, 1);
			this.addBits(player, 500);
		}

		this.announceWinners();
	}

	autoPlay(player: Player, playableCards: string[]): void {
		let autoplay = '';
		if (playableCards.length) autoplay = this.sampleOne(playableCards);
		this.say(player.name + " did not play a card and has been eliminated from the game!" + (autoplay ? " Auto-playing: " +
			autoplay : ""));
		this.eliminatePlayer(player, "You did not play a card!");
		if (autoplay) {
			player.useCommand('play', autoplay);
		} else {
			this.nextRound();
		}
	}

	playActionCard(card: IMoveCard, player: Player, targets: string[], cards: ICard[]): ICard[] | boolean {
		if (!card.action) throw new Error("playActionCard called with a regular card");
		if (!card.action.isPlayableTarget(this, targets, cards, player)) return false;

		let firstTimeShiny = false;
		let drawCards: ICard[] | null = null;
		let cardDetail: string | undefined;
		if (card.id === 'soak') {
			this.topCard.types = ['Water'];
		} else if (card.id === 'magicpowder') {
			this.topCard.types = ['Psychic'];
		} else if (card.id === 'conversion') {
			const type = Tools.toId(targets[0]);
			this.topCard.types = [types[type]];
			cardDetail = types[type];
		} else if (card.id === 'conversion2') {
			const type1 = Tools.toId(targets[0]);
			const type2 = Tools.toId(targets[1]);
			this.topCard.types = [types[type1], types[type2]];
			cardDetail = types[type1] + ", " + types[type2];

			this.checkTopCardStaleness();
		} else if (card.id === 'conversionz') {
			const type1 = Tools.toId(targets[0]);
			const type2 = Tools.toId(targets[1]);
			const type3 = Tools.toId(targets[2]);
			this.topCard.types = [types[type1], types[type2], types[type3]];
			cardDetail = types[type1] + ", " + types[type2] + ", " + types[type3];

			this.checkTopCardStaleness();
		} else if (card.id === 'trickortreat') {
			const topCardTypes = this.topCard.types.slice();
			topCardTypes.push("Ghost");
			this.topCard.types = topCardTypes;
			this.checkTopCardStaleness();
		} else if (card.id === 'forestscurse') {
			const topCardTypes = this.topCard.types.slice();
			topCardTypes.push("Grass");
			this.topCard.types = topCardTypes;
			this.checkTopCardStaleness();
		} else if (card.id === 'transform') {
			const newTopCard = this.pokemonToCard(Dex.getExistingPokemon(targets[0]));
			if (this.rollForShinyPokemon()) {
				newTopCard.shiny = true;
				firstTimeShiny = true;
			}
			this.setTopCard(newTopCard, player);
			cardDetail = newTopCard.name;

			this.checkTopCardStaleness(this.topCard.name + " has no weaknesses! Randomly selecting a different Pokemon...");
		} else if (card.id === 'topsyturvy') {
			this.say("**The turn order was reversed!**");
			this.playerOrder.reverse();
			const playerIndex = this.playerOrder.indexOf(player);
			this.playerList = this.playerOrder.slice(playerIndex + 1);
		} else if (card.id === 'teeterdance') {
			this.say("**The turn order was shuffled!**");
			this.playerOrder = this.shuffle(this.playerOrder);
			let index = this.playerOrder.indexOf(player) + 1;
			if (index === this.playerOrder.length) index = 0;
			this.playerList = this.playerOrder.slice(index);
		} else if (card.id === 'batonpass' || card.id === 'allyswitch') {
			const pokemon = Dex.getExistingPokemon(targets[0]);
			let newIndex = -1;
			for (let i = 0; i < cards.length; i++) {
				if (cards[i].name === pokemon.name) {
					newIndex = i;
					break;
				}
			}

			const card1 = this.getCard();
			const card2 = (card.id === 'batonpass' ? this.getCard() : this.topCard);
			const newTopCard = cards[newIndex] as IPokemonCard;
			if (newTopCard.shiny && !newTopCard.played) firstTimeShiny = true;
			this.setTopCard(newTopCard, player);
			cards.splice(newIndex, 1);
			drawCards = [card1, card2];
			cardDetail = newTopCard.name;
		}

		this.awaitingCurrentPlayerCard = false;

		if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);
		this.storePreviouslyPlayedCard({card: card.displayName || card.name, detail: cardDetail, shiny: firstTimeShiny});

		if (!player.eliminated) {
			this.drawCard(player, this.roundDrawAmount, drawCards);
		}

		return true;
	}
}

export const game: IGameFile<AxewsBattleCards> = Games.copyTemplateProperties(cardGame, {
	achievements,
	aliases: ["axews", "abc", "battlecards"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon or move]"],
	class: AxewsBattleCards,
	description: "Each round, players can play a card that's super-effective against the top card. " +
		"<a href='http://psgc.weebly.com/axewsbattlecards.html'>Action card descriptions</a>",
	name: "Axew's Battle Cards",
	mascot: "Axew",
	scriptedOnly: true,
	variants: [
		{
			name: "No Actions Axew's Battle Cards",
			maxPlayers: 25,
			startingLives: 2,
			variant: "No Actions",
			variantAliases: ["No Action", "No Action Card", "No Action Cards"],
			usesActionCards: false,
		},
	],
});
