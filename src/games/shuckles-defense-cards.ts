import type { Player } from "../room-activity";
import { addPlayer, assert, assertStrictEqual } from "../test/test-tools";
import type { GameFileTests, IGameAchievement, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IActionCardData, ICard, IMoveCard, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

type AchievementNames = "luckofthedraw" | "redshell";
type ActionCardNames = 'acidarmor' | 'irondefense' | 'batonpass' | 'allyswitch' | 'conversion' | 'conversion2' | 'transform' | 'protect' |
	'teeterdance' | 'topsyturvy';
type ActionCardsType = KeyedDict<ActionCardNames, IActionCardData<ShucklesDefenseCards>>;

const redShellEliminations = 5;

class ShucklesDefenseCards extends CardMatching<ActionCardsType> {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"luckofthedraw": {name: "Luck of the Draw", type: 'shiny', bits: 1000, repeatBits: 250, description: 'draw and play a shiny card'},
		"redshell": {name: "Red Shell", type: 'special', bits: 1000, description: 'play a card that eliminates ' +
			redShellEliminations + ' or more players'},
	};

	actionCards: ActionCardsType = {
		"acidarmor": {
			name: "Acid Armor",
			description: "Add Poison type",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.types.includes('Poison')) {
					return game.topCard.name + " is already " + (game.topCard.types.length > 1 ? "part " : "") + "Poison-type!";
				}
			},
		},
		"irondefense": {
			name: "Iron Defense",
			description: "Add Steel type",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.types.includes('Steel')) {
					return game.topCard.name + " is already " + (game.topCard.types.length > 1 ? "part " : "") + "Steel-type!";
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
	hackmonsTypes: boolean = false;
	lives = new Map<Player, number>();
	maximumPlayedCards: number = 1;
	maxLateJoinRound: number = 1;
	maxPlayers = 20;
	playableCardDescription = "You must play a card that resists the top card.";
	roundDrawAmount: number = 1;
	shinyCardAchievement = ShucklesDefenseCards.achievements.luckofthedraw;
	skippedPlayerAchievement = ShucklesDefenseCards.achievements.redshell;
	skippedPlayerAchievementAmount = redShellEliminations;
	showPlayerCards = false;
	startingLives: number = 1;
	usableTypes: Dict<string> = {};

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
		if (this.hasNoResistances(dex, pokemon.types)) return false;
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
			while (!newKey || newKey === originalKey || this.hasNoResistances(dex, newTypes)) {
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
		const resistancesCounts: Dict<number> = {};
		const deckPool = this.shuffle(this.deckPool);
		const deck: ICard[] = [];
		const dex = this.getDex();
		const minimumDeck = (this.maxPlayers + 1) * this.options.cards!;
		for (const card of deckPool) {
			const resistances = dex.getResistances(Dex.getExistingPokemon(card.name)).join(",");
			if (resistances in resistancesCounts && resistancesCounts[resistances] >= this.options.cards!) continue;
			if (!(resistances in resistancesCounts)) resistancesCounts[resistances] = 0;
			resistancesCounts[resistances]++;

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
			for (const actionCardId in this.actionCards) {
				const actionCard = this.actionCards[actionCardId as ActionCardNames];
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

	hasNoResistances(dex: typeof Dex, types: readonly string[]): boolean {
		let noResistances = true;
		for (const key of dex.getData().typeKeys) {
			const type = dex.getExistingType(key).name;
			if (!dex.isImmune(type, types) && dex.getEffectiveness(type, types) < 0) {
				noResistances = false;
				break;
			}
		}

		return noResistances;
	}

	checkTopCardStaleness(): void {
		if (this.hasNoResistances(this.getDex(), this.topCard.types)) {
			const previousTopCard = this.topCard.name;
			let topCard = this.getCard();
			while (topCard.action) {
				topCard = this.getCard();
			}
			this.topCard = topCard as IPokemonCard;
			this.say(previousTopCard + " had no resistances in the deck and was replaced with " + this.topCard.name + "!");
		}
	}

	isPlayableCard(card: ICard, otherCard?: ICard): boolean {
		if (card === this.topCard || card === otherCard || !this.isPokemonCard(card)) return false;
		if (!otherCard) otherCard = this.topCard;
		if (!this.isPokemonCard(otherCard)) return false;

		const dex = this.getDex();
		let valid = false;
		for (const type of otherCard.types) {
			if (dex.isImmune(type, card.types)) {
				continue;
			} else {
				const effectiveness = dex.getEffectiveness(type, card.types);
				if (effectiveness < 0) {
					valid = true;
					break;
				}
			}
		}

		return valid;
	}

	playActionCard(card: IMoveCard, player: Player, targets: string[], cards: ICard[]): boolean {
		if (!card.action) throw new Error("playActionCard called with a regular card");
		if (card.action.getTargetErrors(this, targets, player, cards)) return false;

		const id = card.id as ActionCardNames;
		let firstTimeShiny = false;
		let drawCards: ICard[] | null = null;
		let cardDetail: string | undefined;
		if (id === 'acidarmor') {
			const topCardTypes = this.topCard.types.slice();
			topCardTypes.push("Poison");
			this.topCard.types = topCardTypes;
		} else if (id === 'irondefense') {
			const topCardTypes = this.topCard.types.slice();
			topCardTypes.push("Steel");
			this.topCard.types = topCardTypes;
		} else if (id === 'conversion') {
			const type = Tools.toId(targets[0]);
			this.topCard.types = [this.usableTypes[type]];
			cardDetail = this.usableTypes[type];
		} else if (id === 'conversion2') {
			const type1 = Tools.toId(targets[0]);
			const type2 = Tools.toId(targets[1]);
			this.topCard.types = [this.usableTypes[type1], this.usableTypes[type2]];
			cardDetail = this.usableTypes[type1] + ", " + this.usableTypes[type2];
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

const tests: GameFileTests<ShucklesDefenseCards> = {
	'it should use card types in isPlayableCard()': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const registeel = game.pokemonToCard(Dex.getExistingPokemon("Registeel"));
			const squirtle = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			const charmander = game.pokemonToCard(Dex.getExistingPokemon("Charmander"));
			const pikachu = game.pokemonToCard(Dex.getExistingPokemon("Pikachu"));
			const bulbasaur = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));

			assertStrictEqual(game.isPlayableCard(registeel, registeel), false);
			assertStrictEqual(game.isPlayableCard(charmander, registeel), true);
			assertStrictEqual(game.isPlayableCard(pikachu, registeel), true);
			assertStrictEqual(game.isPlayableCard(squirtle, registeel), true);
			assertStrictEqual(game.isPlayableCard(bulbasaur, registeel), false);

			registeel.types = ['Water'];
			assertStrictEqual(game.isPlayableCard(charmander, registeel), false);
			assertStrictEqual(game.isPlayableCard(pikachu, registeel), false);
			assertStrictEqual(game.isPlayableCard(squirtle, registeel), true);
			assertStrictEqual(game.isPlayableCard(bulbasaur, registeel), true);
		},
	},
	'action cards - acidarmor': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const acidarmor = game.actionCards.acidarmor;
			assert(acidarmor);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(acidarmor.getAutoPlayTarget(game, player));
			assertStrictEqual(!acidarmor.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(!acidarmor.getAutoPlayTarget(game, player));
			assertStrictEqual(!acidarmor.getTargetErrors(game, [], player), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Ekans"));
			assert(!acidarmor.getAutoPlayTarget(game, player));
			assertStrictEqual(!acidarmor.getTargetErrors(game, [], player), false);
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
			if (game.deltaTypes || game.hackmonsTypes) return;
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

export const game: IGameFile<ShucklesDefenseCards> = Games.copyTemplateProperties(cardGame, {
	aliases: ["shuckles", "sdc", "defensecards"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon or move]"],
	class: ShucklesDefenseCards,
	description: "Each round, players can play a card that resists the top card!",
	name: "Shuckle's Defense Cards",
	mascot: "Shuckle",
	scriptedOnly: true,
	tests: Object.assign({}, cardGame.tests, tests),
	variants: [
		{
			name: "No Actions Shuckle's Defense Cards",
			maxPlayers: 25,
			startingLives: 2,
			variantAliases: ["No Actions", "No Action", "No Action Card", "No Action Cards"],
			usesActionCards: false,
		},
		{
			name: "Hackmons Shuckle's Defense Cards",
			variantAliases: ["Hackmons", "Hackmons Cup"],
			hackmonsTypes: true,
		},
		{
			name: "Delta Species Shuckle's Defense Cards",
			variantAliases: ["delta species", "delta"],
			deltaTypes: true,
		},
	],
});
