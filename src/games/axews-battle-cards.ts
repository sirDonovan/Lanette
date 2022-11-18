import type { Player } from "../room-activity";
import { addPlayer, assert, assertStrictEqual } from "../test/test-tools";
import type { GameFileTests, IGameAchievement, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IActionCardData, ICard, IMoveCard, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

type AchievementNames = "luckofthedraw" | "trumpcard";
type ActionCardNames = 'soak' | 'trickortreat' | 'forestscurse' | 'magicpowder' | 'batonpass' | 'allyswitch' | 'conversion' |
	'conversion2' | 'transform' | 'protect' | 'teeterdance' | 'topsyturvy';
type ActionCardsType = KeyedDict<ActionCardNames, IActionCardData<AxewsBattleCards>>;

const trumpCardEliminations = 5;

class AxewsBattleCards extends CardMatching<ActionCardsType> {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"luckofthedraw": {name: "Luck of the Draw", type: 'shiny', bits: 1000, repeatBits: 250, description: 'draw and play a shiny card'},
		"trumpcard": {name: "Trump Card", type: 'special', bits: 1000, description: 'play a card that eliminates ' +
			trumpCardEliminations + ' or more players'},
	};

	actionCards: ActionCardsType = {
		"soak": {
			name: "Soak",
			description: "Make pure Water type",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.types.length === 1 && game.topCard.types[0] === 'Water') {
					return game.topCard.name + " is already pure Water-type!";
				}
			},
		},
		"trickortreat": {
			name: "Trick-or-Treat",
			description: "Add Ghost type",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.types.includes('Ghost')) {
					return game.topCard.name + " is already " + (game.topCard.types.length > 1 ? "part " : "") + "Ghost-type!";
				}
			},
		},
		"forestscurse": {
			name: "Forest's Curse",
			description: "Add Grass type",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.types.includes('Grass')) {
					return game.topCard.name + " is already " + (game.topCard.types.length > 1 ? "part " : "") + "Grass-type!";
				}
			},
		},
		"magicpowder": {
			name: "Magic Powder",
			description: "Make pure Psychic type",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.types.length === 1 && game.topCard.types[0] === 'Psychic') {
					return game.topCard.name + " is already pure Psychic-type!";
				}
			},
		},
		"batonpass": {
			name: "Baton Pass",
			description: "Replace top card & draw 2",
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game, player, cardsSubset) {
				const cards = cardsSubset || game.playerCards.get(player);
				if (cards) {
					const shuffledCards = game.shuffle(cards);
					for (const card of shuffledCards) {
						if (!this.getTargetErrors(game, [card.name], player, cardsSubset)) {
							return this.name + ", " + card.name;
						}
					}
				}
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				return this.getRandomTarget!(game, player, cardsSubset);
			},
			getTargetErrors(game, targets, player, cardsSubset) {
				if (targets.length !== 1) {
					return "You must specify 1 Pokemon.";
				}

				const id = Tools.toId(targets[0]);
				if (!id) {
					return "Usage: ``" + Config.commandCharacter + "play " + this.name + ", [Pokemon]``";
				}

				const pokemon = Dex.getPokemon(targets[0]);
				if (!pokemon) {
					return CommandParser.getErrorText(['invalidPokemon', targets[0]]);
				}

				const cards = cardsSubset || game.playerCards.get(player);
				if (cards) {
					const index = game.getCardIndex(pokemon.name, cards);
					if (index === -1) {
						return "You do not have [ " + pokemon.name + " ].";
					}

					if (cards[index].action) {
						return "You cannot pass an action card.";
					}
				}

				if (game.topCard.id === pokemon.id) {
					return "The top card is already " + pokemon.name + ".";
				}
			},
		},
		"allyswitch": {
			name: "Ally Switch",
			description: "Swap with top card & draw 1",
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game, player, cardsSubset) {
				const cards = cardsSubset || game.playerCards.get(player);
				if (cards) {
					const shuffledCards = game.shuffle(cards);
					for (const card of shuffledCards) {
						if (!this.getTargetErrors(game, [card.name], player, cardsSubset)) {
							return this.name + ", " + card.name;
						}
					}
				}
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				return this.getRandomTarget!(game, player, cardsSubset);
			},
			getTargetErrors(game, targets, player, cardsSubset) {
				if (targets.length !== 1) {
					return "You must specify 1 Pokemon.";
				}

				const id = Tools.toId(targets[0]);
				if (!id) {
					return "Usage: ``" + Config.commandCharacter + "play " + this.name + ", [Pokemon]``";
				}

				const pokemon = Dex.getPokemon(targets[0]);
				if (!pokemon) {
					return CommandParser.getErrorText(['invalidPokemon', targets[0]]);
				}

				const cards = cardsSubset || game.playerCards.get(player);
				if (cards) {
					const index = game.getCardIndex(pokemon.name, cards);
					if (index === -1) {
						return "You do not have [ " + pokemon.name + " ].";
					}

					if (cards[index].action) {
						return "You cannot switch an action card.";
					}
				}

				if (game.topCard.id === pokemon.id) {
					return "The top card is already " + pokemon.name + ".";
				}
			},
		},
		"conversion": {
			name: "Conversion",
			description: "Change to 1 type",
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game, player, cardsSubset) {
				const dex = game.getDex();
				const typeKeys = game.shuffle(dex.getData().typeKeys);
				let usableType: string | undefined;
				for (const typeKey of typeKeys) {
					const typeName = dex.getExistingType(typeKey).name;
					if (!this.getTargetErrors(game, [typeName], player, cardsSubset)) {
						usableType = typeName;
						break;
					}
				}

				if (!usableType) return;

				return this.name + ", " + usableType;
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				return this.getRandomTarget!(game, player, cardsSubset);
			},
			getTargetErrors(game, targets) {
				if (targets.length !== 1) {
					return "You must specify 1 type.";
				}

				const type = Tools.toId(targets[0]);
				if (!type) {
					return "Usage: ``" + Config.commandCharacter + "play " + this.name + ", [type]``";
				}

				if (!(type in game.usableTypes)) {
					return CommandParser.getErrorText(['invalidType', targets[0]]);
				}

				if (game.topCard.types.length === 1 && game.usableTypes[type] === game.topCard.types[0]) {
					return "The top card is already " + game.usableTypes[type] + " type.";
				}
			},
		},
		"conversion2": {
			name: "Conversion 2",
			description: "Change to 2 types",
			noOldGen: true,
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game, player, cardsSubset) {
				const dex = game.getDex();
				const typeKeys = game.shuffle(dex.getData().typeKeys);
				let usableTypes: string | undefined;
				for (let i = 0; i < typeKeys.length; i++) {
					const typeNameA = dex.getExistingType(typeKeys[i]).name;
					for (let j = 0; j < typeKeys.length; j++) {
						if (j === i) continue;
						const typeNameB = dex.getExistingType(typeKeys[j]).name;
						if (!this.getTargetErrors(game, [typeNameA, typeNameB], player, cardsSubset)) {
							usableTypes = typeNameA + ", " + typeNameB;
							break;
						}
					}

					if (usableTypes) break;
				}

				if (!usableTypes) return;
				return this.name + ", " + usableTypes;
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				return this.getRandomTarget!(game, player, cardsSubset);
			},
			getTargetErrors(game, targets) {
				if (targets.length !== 2) {
					return "You must specify 2 types.";
				}

				const type1 = Tools.toId(targets[0]);
				const type2 = Tools.toId(targets[1]);
				if (!type1 || !type2) {
					return "Usage: ``" + Config.commandCharacter + "play " + this.name + ", [type 1], [type 2]``";
				}

				if (!(type1 in game.usableTypes)) {
					return CommandParser.getErrorText(['invalidType', targets[0]]);
				}

				if (!(type2 in game.usableTypes)) {
					return CommandParser.getErrorText(['invalidType', targets[1]]);
				}

				if (type1 === type2) {
					return "Please enter two unique types.";
				}

				if (game.topCard.types.length === 2) {
					const typesList = [game.usableTypes[type1], game.usableTypes[type2]];
					if (game.topCard.types.slice().sort().join(",") === typesList.sort().join(",")) {
						return "The top card is already " + typesList.join("/") + " type.";
					}
				}
			},
		},
		"transform": {
			name: "Transform",
			description: "Change the top card",
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game, player, cardsSubset) {
				const pool = game.shuffle(game.deckPool);
				let usableCard: string | undefined;
				for (const card of pool) {
					if (!this.getTargetErrors(game, [card.name], player, cardsSubset)) {
						usableCard = card.name;
						break;
					}
				}

				if (!usableCard) return;
				return this.name + ", " + usableCard;
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				return this.getRandomTarget!(game, player, cardsSubset);
			},
			getTargetErrors(game, targets) {
				const id = Tools.toId(targets[0]);
				if (!id) {
					return "Usage: ``" + Config.commandCharacter + "play " + this.name + ", [Pokemon]``";
				}

				const pokemon = Dex.getPokemon(targets[0]);
				if (!pokemon) {
					return CommandParser.getErrorText(['invalidPokemon', targets[0]]);
				}

				let deckHasSpecies = false;
				for (const card of game.deckPool) {
					if (card.id === pokemon.id) {
						deckHasSpecies = true;
						break;
					}
				}

				if (!deckHasSpecies) {
					return pokemon.name + " is not playable in this game.";
				}

				if (game.topCard.id === pokemon.id) {
					return "The top card is already " + pokemon.name + ".";
				}
			},
		},
		"protect": {
			name: "Protect",
			description: "Skip your turn",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget() {
				return this.name;
			},
			getTargetErrors() {
				return "";
			},
		},
		"teeterdance": {
			name: "Teeter Dance",
			description: "Shuffle the turn order",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget() {
				return this.name;
			},
			getTargetErrors() {
				return "";
			},
		},
		"topsyturvy": {
			name: "Topsy-Turvy",
			description: "Reverse the turn order",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget() {
				return this.name;
			},
			getTargetErrors() {
				return "";
			},
		},
	};
	finitePlayerCards = false;
	lives = new Map<Player, number>();
	maximumPlayedCards: number = 1;
	maxLateJoinRound: number = 1;
	maxPlayers = 20;
	playableCardDescription = "You must play a card that is super-effective against the top card.";
	roundDrawAmount: number = 1;
	shinyCardAchievement = AxewsBattleCards.achievements.luckofthedraw;
	skippedPlayerAchievement = AxewsBattleCards.achievements.trumpcard;
	skippedPlayerAchievementAmount = trumpCardEliminations;
	showPlayerCards = false;
	startingLives: number = 1;
	usableTypes: Dict<string> = {};
	weaknessLimit: number = 5;

	onSignups(): void {
		super.onSignups();

		const dex = this.getDex();
		for (const key of dex.getData().typeKeys) {
			const type = dex.getExistingType(key);
			this.usableTypes[type.id] = type.name;
			this.usableTypes[type.id + 'type'] = type.name;
		}
	}

	onRemovePlayer(player: Player): void {
		const index = this.playerOrder.indexOf(player);
		if (index > -1) this.playerOrder.splice(index, 1);
		if (player === this.currentPlayer && this.canPlay) {
			this.nextRound();
		}
	}

	filterPoolItem(dex: typeof Dex, pokemon: IPokemon): boolean {
		if (this.hasNoWeaknesses(dex, pokemon.types)) return false;
		return true;
	}

	filterForme(dex: typeof Dex, forme: IPokemon): boolean {
		const baseSpecies = dex.getPokemon(forme.baseSpecies);
		if (baseSpecies && !Tools.compareArrays(baseSpecies.types, forme.types) &&
			!(baseSpecies.name === "Arceus" || baseSpecies.name === "Silvally")) return true;
		return false;
	}

	alterCard(dex: typeof Dex, card: IPokemonCard): IPokemonCard {
		if (this.hackmonsTypes) {
			const originalKey = this.getTypingKey(card.types);
			const typeKeys = dex.getData().typeKeys;

			let newTypes: string[] = [];
			let newKey = '';
			while (!newKey || newKey === originalKey || this.hasNoWeaknesses(dex, newTypes)) {
				const shuffledTypeKeys = this.shuffle(typeKeys);
				if (this.random(2)) {
					newTypes = [dex.getExistingType(shuffledTypeKeys[0]).name, dex.getExistingType(shuffledTypeKeys[1]).name];
				} else {
					newTypes = [dex.getExistingType(shuffledTypeKeys[0]).name];
				}
				newKey = this.getTypingKey(newTypes);
			}

			card.types = newTypes;
		} else if (this.deltaTypes) {
			if (card.types.length <= 2 && this.random(2)) {
				const typeKeys = dex.getData().typeKeys;
				const dualType = card.types.length === 2;
				let deltaType = dex.getExistingType(this.sampleOne(typeKeys)).name;
				while (deltaType === card.types[0] || (dualType && deltaType === card.types[1])) {
					deltaType = dex.getExistingType(this.sampleOne(typeKeys)).name;
				}
				card.types = dualType ? [card.types[0], deltaType] : [deltaType];
				card.name += " δ";
			}
		}

		return card;
	}

	createDeck(): void {
		const weaknessCounts: Dict<number> = {};
		const deckPool = this.shuffle(this.deckPool);
		const deck: ICard[] = [];
		const dex = this.getDex();
		const minimumDeck = (this.playerCount + 1) * this.options.cards!;
		for (const card of deckPool) {
			if (!this.usesActionCards && card.types.join("") === "Normal") continue;

			let weaknesses: string;
			if (this.inverseTypes) {
				weaknesses = dex.getInverseWeaknesses(Dex.getExistingPokemon(card.name)).join(",");
			} else {
				weaknesses = dex.getWeaknesses(Dex.getExistingPokemon(card.name)).join(",");
			}

			if (weaknesses in weaknessCounts && weaknessCounts[weaknesses] >= this.weaknessLimit) continue;
			if (!(weaknesses in weaknessCounts)) weaknessCounts[weaknesses] = 0;
			weaknessCounts[weaknesses]++;

			if (this.rollForShinyPokemon()) card.shiny = true;
			deck.push(card);
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
			let maxPercentage = 0.15;
			const lowestPercentage = actionCards.length / (deck.length + totalActionCards);
			if (maxPercentage < lowestPercentage) maxPercentage = lowestPercentage;
			while (actionCardAmount && totalActionCards / (deck.length + totalActionCards) > maxPercentage) {
				actionCardAmount--;
				totalActionCards = actionCards.length * actionCardAmount;
			}
			if (!actionCardAmount) {
				this.createDeck();
				return;
			}
			this.actionCardAmount = actionCardAmount;
			for (const action of actionCards) {
				const actionCard = this.actionCards[action as ActionCardNames];
				for (let i = 0; i < actionCardAmount; i++) {
					const card = this.moveToCard(Dex.getMoveCopy(actionCard.name));
					// @ts-expect-error
					card.action = actionCard;
					deck.push(card);
				}
			}
		}

		this.deck = this.shuffle(deck);
	}

	getTypingKey(types: readonly string[]): string {
		return types.slice().sort().join(',');
	}

	getCardChatDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card);
	}

	getCardPrivateDetails(card: IPokemonCard): string {
		return "<b>Typing</b>:&nbsp;" + this.getChatTypeLabel(card);
	}

	hasNoWeaknesses(dex: typeof Dex, types: readonly string[]): boolean {
		for (const key of dex.getData().typeKeys) {
			const type = dex.getExistingType(key).name;
			if (this.inverseTypes) {
				if (dex.getInverseEffectiveness(type, types) > 0) return false;
			} else {
				if (!dex.isImmune(type, types) && dex.getEffectiveness(type, types) > 0) return false;
			}
		}
		return true;
	}

	checkTopCardStaleness(): void {
		if (this.hasNoWeaknesses(this.getDex(), this.topCard.types)) {
			const previousTopCard = this.topCard.name;
			let topCard = this.getCard();
			while (topCard.action) {
				topCard = this.getCard();
			}
			this.topCard = topCard as IPokemonCard;
			this.say(previousTopCard + " had no weaknesses in the deck and was replaced with " + this.topCard.name + "!");
		}
	}

	isPlayableCard(card: ICard, otherCard?: ICard): boolean {
		if (card === this.topCard || card === otherCard || !this.isPokemonCard(card)) return false;
		if (!otherCard) otherCard = this.topCard;
		if (!this.isPokemonCard(otherCard)) return false;

		const dex = this.getDex();
		for (const type of card.types) {
			if (this.inverseTypes) {
				if (dex.getInverseEffectiveness(type, otherCard.types) > 0) return true;
			} else {
				if (dex.isImmune(type, otherCard.types)) {
					continue;
				} else {
					if (dex.getEffectiveness(type, otherCard.types) > 0) return true;
				}
			}
		}

		return false;
	}

	playActionCard(card: IMoveCard, player: Player, targets: string[], cards: ICard[]): boolean {
		if (!card.action) throw new Error("playActionCard called with a regular card");
		if (card.action.getTargetErrors(this, targets, player, cards)) return false;

		const id = card.id as ActionCardNames;
		let firstTimeShiny = false;
		let drawCards: ICard[] | null = null;
		let cardDetail: string | undefined;
		if (id === 'soak') {
			this.topCard.types = ['Water'];
		} else if (id === 'magicpowder') {
			this.topCard.types = ['Psychic'];
		} else if (id === 'conversion') {
			const type = Tools.toId(targets[0]);
			this.topCard.types = [this.usableTypes[type]];
			cardDetail = this.usableTypes[type];
		} else if (id === 'conversion2') {
			const type1 = Tools.toId(targets[0]);
			const type2 = Tools.toId(targets[1]);
			this.topCard.types = [this.usableTypes[type1], this.usableTypes[type2]];
			cardDetail = this.usableTypes[type1] + ", " + this.usableTypes[type2];
		} else if (id === 'trickortreat') {
			const topCardTypes = this.topCard.types.slice();
			topCardTypes.push("Ghost");
			this.topCard.types = topCardTypes;
		} else if (id === 'forestscurse') {
			const topCardTypes = this.topCard.types.slice();
			topCardTypes.push("Grass");
			this.topCard.types = topCardTypes;
		} else if (id === 'transform') {
			const newTopCard = this.alterCard(this.getDex(), this.pokemonToCard(Dex.getExistingPokemon(targets[0])));
			if (this.rollForShinyPokemon()) {
				newTopCard.shiny = true;
				firstTimeShiny = true;
			}
			this.setTopCard(newTopCard, player);
			cardDetail = newTopCard.name;
		} else if (id === 'topsyturvy') {
			this.say("**The turn order was reversed!**");
			this.playerOrder.reverse();
			const playerIndex = this.playerOrder.indexOf(player);
			this.playerList = this.playerOrder.slice(playerIndex + 1);
		} else if (id === 'teeterdance') {
			this.say("**The turn order was shuffled!**");
			this.playerOrder = this.shuffle(this.playerOrder);
			let index = this.playerOrder.indexOf(player) + 1;
			if (index === this.playerOrder.length) index = 0;
			this.playerList = this.playerOrder.slice(index);
		} else if (id === 'batonpass' || id === 'allyswitch') {
			const pokemon = Dex.getExistingPokemon(targets[0]);
			let newIndex = -1;
			for (let i = 0; i < cards.length; i++) {
				if (cards[i].id === pokemon.id) {
					newIndex = i;
					break;
				}
			}

			const card1 = this.getCard();
			const card2 = id === 'batonpass' ? this.getCard() : this.topCard;
			const newTopCard = cards[newIndex] as IPokemonCard;
			if (newTopCard.shiny && !newTopCard.played) firstTimeShiny = true;
			this.setTopCard(newTopCard, player);
			cards.splice(newIndex, 1);
			drawCards = [card1, card2];
			cardDetail = newTopCard.name;
		}

		this.awaitingCurrentPlayerCard = false;

		if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);
		this.storePreviouslyPlayedCard({card: card.name, player: player.name, detail: cardDetail, shiny: firstTimeShiny});

		if (!player.eliminated) {
			this.currentPlayer = null;
			const drawnCards = this.drawCard(player, this.roundDrawAmount, drawCards);
			const htmlPage = this.getHtmlPage(player);
			htmlPage.renderHandHtml();
			htmlPage.renderCardActionsHtml();
			htmlPage.renderPlayedCardsHtml([card]);
			htmlPage.renderDrawnCardsHtml(drawnCards);
			htmlPage.send();
		}

		return true;
	}
}

const tests: GameFileTests<AxewsBattleCards> = {
	'it should use card types in isPlayableCard()': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes || game.inverseTypes) return;

			const golem = game.pokemonToCard(Dex.getExistingPokemon("Golem"));
			const squirtle = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			const bulbasaur = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			const charmander = game.pokemonToCard(Dex.getExistingPokemon("Charmander"));
			const pikachu = game.pokemonToCard(Dex.getExistingPokemon("Pikachu"));

			assertStrictEqual(game.isPlayableCard(golem, golem), false);
			assertStrictEqual(game.isPlayableCard(charmander, golem), false);
			assertStrictEqual(game.isPlayableCard(pikachu, golem), false);
			assertStrictEqual(game.isPlayableCard(squirtle, golem), true);
			assertStrictEqual(game.isPlayableCard(bulbasaur, golem), true);

			golem.types = ['Water'];
			assertStrictEqual(game.isPlayableCard(charmander, golem), false);
			assertStrictEqual(game.isPlayableCard(pikachu, golem), true);
			assertStrictEqual(game.isPlayableCard(squirtle, golem), false);
			assertStrictEqual(game.isPlayableCard(bulbasaur, golem), true);
		},
	},
	'action cards - soak': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const soak = game.actionCards.soak;
			assert(soak);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(soak.getAutoPlayTarget(game, player));
			assertStrictEqual(!soak.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Poliwrath"));
			assert(soak.getAutoPlayTarget(game, player));
			assertStrictEqual(!soak.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(!soak.getAutoPlayTarget(game, player));
			assertStrictEqual(!soak.getTargetErrors(game, [], player), false);
		},
	},
	'action cards - trickortreat': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const trickortreat = game.actionCards.trickortreat;
			assert(trickortreat);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(trickortreat.getAutoPlayTarget(game, player));
			assertStrictEqual(!trickortreat.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Gastly"));
			assert(!trickortreat.getAutoPlayTarget(game, player));
			assertStrictEqual(!trickortreat.getTargetErrors(game, [], player), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Duskull"));
			assert(!trickortreat.getAutoPlayTarget(game, player));
			assertStrictEqual(!trickortreat.getTargetErrors(game, [], player), false);
		},
	},
	'action cards - forestscurse': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const forestscurse = game.actionCards.forestscurse;
			assert(forestscurse);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(forestscurse.getAutoPlayTarget(game, player));
			assertStrictEqual(!forestscurse.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(!forestscurse.getAutoPlayTarget(game, player));
			assertStrictEqual(!forestscurse.getTargetErrors(game, [], player), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Tangela"));
			assert(!forestscurse.getAutoPlayTarget(game, player));
			assertStrictEqual(!forestscurse.getTargetErrors(game, [], player), false);
		},
	},
	'action cards - magicpowder': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const magicpowder = game.actionCards.magicpowder;
			assert(magicpowder);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(magicpowder.getAutoPlayTarget(game, player));
			assertStrictEqual(!magicpowder.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Slowpoke"));
			assert(magicpowder.getAutoPlayTarget(game, player));
			assertStrictEqual(!magicpowder.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Abra"));
			assert(!magicpowder.getAutoPlayTarget(game, player));
			assertStrictEqual(!magicpowder.getTargetErrors(game, [], player), false);
		},
	},
	'action cards - batonpass': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const batonpass = game.actionCards.batonpass;
			assert(batonpass);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			let hand = [game.pokemonToCard(Dex.getExistingPokemon("Squirtle"))];
			assert(batonpass.getAutoPlayTarget(game, player, hand));
			assertStrictEqual(!batonpass.getTargetErrors(game, ["Squirtle"], player, hand), true);
			assertStrictEqual(!batonpass.getTargetErrors(game, ["Charmander"], player, hand), false);
			assertStrictEqual(!batonpass.getTargetErrors(game, [""], player, hand), false);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"))];
			assert(!batonpass.getAutoPlayTarget(game, player, hand));
			assertStrictEqual(!batonpass.getTargetErrors(game, ["Bulbasaur"], player, hand), false);
		},
	},
	'action cards - allyswitch': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const allyswitch = game.actionCards.allyswitch;
			assert(allyswitch);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			let hand = [game.pokemonToCard(Dex.getExistingPokemon("Squirtle"))];
			assert(allyswitch.getAutoPlayTarget(game, player, hand));
			assertStrictEqual(!allyswitch.getTargetErrors(game, ["Squirtle"], player, hand), true);
			assertStrictEqual(!allyswitch.getTargetErrors(game, ["Charmander"], player, hand), false);
			assertStrictEqual(!allyswitch.getTargetErrors(game, [""], player, hand), false);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"))];
			assert(!allyswitch.getAutoPlayTarget(game, player, hand));
			assertStrictEqual(!allyswitch.getTargetErrors(game, ["Bulbasaur"], player, hand), false);
		},
	},
	'action cards - conversion': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const conversion = game.actionCards.conversion;
			assert(conversion);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(conversion.getAutoPlayTarget(game, player));
			assertStrictEqual(!conversion.getTargetErrors(game, ["Grass"], player), true);
			assertStrictEqual(!conversion.getTargetErrors(game, ["Poison"], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(conversion.getAutoPlayTarget(game, player));
			assertStrictEqual(!conversion.getTargetErrors(game, ["Grass"], player), true);
			assertStrictEqual(!conversion.getTargetErrors(game, ["Water"], player), false);
			assertStrictEqual(!conversion.getTargetErrors(game, [""], player), false);
			assertStrictEqual(!conversion.getTargetErrors(game, ["Grass", "Fire"], player), false);
		},
	},
	'action cards - conversion2': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const conversion2 = game.actionCards['conversion2'];
			assert(conversion2);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(conversion2.getAutoPlayTarget(game, player));
			assertStrictEqual(!conversion2.getTargetErrors(game, ["Water", "Fire"], player), true);
			assertStrictEqual(!conversion2.getTargetErrors(game, ["Grass", "Poison"], player), false);
			assertStrictEqual(!conversion2.getTargetErrors(game, ["Poison", "Grass"], player), false);
			assertStrictEqual(!conversion2.getTargetErrors(game, ["Water"], player), false);
			assertStrictEqual(!conversion2.getTargetErrors(game, [""], player), false);
		},
	},
	'action cards - transform': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes || game.requiredGen) return;
			game.createDeckPool();

			const transform = game.actionCards.transform;
			assert(transform);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(transform.getAutoPlayTarget(game, player));
			assertStrictEqual(!transform.getTargetErrors(game, ["Squirtle"], player), true);
			assertStrictEqual(!transform.getTargetErrors(game, ["Bulbasaur"], player), false);
			assertStrictEqual(!transform.getTargetErrors(game, [""], player), false);
		},
	},
	'action cards - protect': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const protect = game.actionCards.protect;
			assert(protect);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(protect.getAutoPlayTarget(game, player));
			assertStrictEqual(!protect.getTargetErrors(game, [], player), true);
		},
	},
	'action cards - teeterdance': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const teeterdance = game.actionCards.teeterdance;
			assert(teeterdance);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(teeterdance.getAutoPlayTarget(game, player));
			assertStrictEqual(!teeterdance.getTargetErrors(game, [], player), true);
		},
	},
	'action cards - topsyturvy': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const topsyturvy = game.actionCards.topsyturvy;
			assert(topsyturvy);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(topsyturvy.getAutoPlayTarget(game, player));
			assertStrictEqual(!topsyturvy.getTargetErrors(game, [], player), true);
		},
	},
};

export const game: IGameFile<AxewsBattleCards> = Games.copyTemplateProperties(cardGame, {
	aliases: ["axews", "abc", "battlecards"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon or move]"],
	class: AxewsBattleCards,
	description: "Each round, players can play a card that's super-effective against the top card!",
	name: "Axew's Battle Cards",
	mascot: "Axew",
	scriptedOnly: true,
	tests: Object.assign({}, cardGame.tests, tests),
	variants: [
		{
			name: "No Actions Axew's Battle Cards",
			maxPlayers: 25,
			startingLives: 2,
			variantAliases: ["No Actions", "No Action", "No Action Card", "No Action Cards"],
			usesActionCards: false,
		},
		{
			name: "Hackmons Axew's Battle Cards",
			variantAliases: ["Hackmons", "Hackmons Cup"],
			hackmonsTypes: true,
		},
		{
			name: "Inverse Axew's Battle Cards",
			description: "Each round, players can play a card that's super-effective against the top card using an inverted type chart!",
			variantAliases: ["Inverse"],
			inverseTypes: true,
		},
		{
			name: "Delta Species Axew's Battle Cards",
			variantAliases: ["delta species", "delta"],
			deltaTypes: true,
		},
		{
			name: "Axew's Kanto Battle Cards",
			variantAliases: ["kanto", "gen1"],
			requiredGen: 1,
			maxPlayers: 20,
		},
		{
			name: "Axew's Johto Battle Cards",
			variantAliases: ["johto", "gen2"],
			requiredGen: 2,
			maxPlayers: 16,
		},
		{
			name: "Axew's Hoenn Battle Cards",
			variantAliases: ["hoenn", "gen3"],
			requiredGen: 3,
			maxPlayers: 20,
		},
		{
			name: "Axew's Sinnoh Battle Cards",
			variantAliases: ["sinnoh", "gen4"],
			requiredGen: 4,
			maxPlayers: 18,
		},
		{
			name: "Axew's Unova Battle Cards",
			variantAliases: ["unova", "gen5"],
			requiredGen: 5,
			maxPlayers: 20,
		},
		{
			name: "Axew's Kalos Battle Cards",
			variantAliases: ["kalos", "gen6"],
			requiredGen: 6,
			maxPlayers: 14,
		},
		{
			name: "Axew's Alola Battle Cards",
			variantAliases: ["alola", "gen7"],
			requiredGen: 7,
			maxPlayers: 18,
		},
		{
			name: "Axew's Galar Battle Cards",
			variantAliases: ["galar", "gen8"],
			requiredGen: 8,
			maxPlayers: 18,
		},
		{
			name: "Axew's Paldea Battle Cards",
			variantAliases: ["paldea", "gen9"],
			requiredGen: 9,
			maxPlayers: 18,
		},
	],
});
