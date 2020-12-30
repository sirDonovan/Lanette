import type { Player } from "../room-activity";
import { assert, assertStrictEqual } from "../test/test-tools";
import type { GameFileTests, IGameAchievement, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IActionCardData, ICard, IMoveCard, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

type AchievementNames = "luckofthedraw" | "redshell";
type ActionCardNames = 'acidarmor' | 'irondefense' | 'batonpass' | 'allyswitch' | 'conversion' | 'conversion2' | 'transform' | 'protect' |
	'teeterdance' | 'topsyturvy';
type ActionCardsType = KeyedDict<ActionCardNames, IActionCardData<ShucklesDefenseCards>>;

const data: {usableTypes: Dict<string>} = {
	usableTypes: {},
};

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
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.types.includes('Poison')) {
					if (player) {
						player.say(game.topCard.name + " is already " + (game.topCard.types.length > 1 ? "part " : "") + "Poison-type!");
					}
					return false;
				}

				return true;
			},
		},
		"irondefense": {
			name: "Iron Defense",
			description: "Add Steel type",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.types.includes('Steel')) {
					if (player) {
						player.say(game.topCard.name + " is already " + (game.topCard.types.length > 1 ? "part " : "") + "Steel-type!");
					}
					return false;
				}

				return true;
			},
		},
		"batonpass": {
			name: "Baton Pass",
			description: "Replace top card & draw 2",
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game, hand) {
				const cards = game.shuffle(hand);
				for (const card of cards) {
					if (this.isPlayableTarget(game, [card.name], hand)) {
						return this.name + ", " + card.name;
					}
				}
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				if (targets.length !== 1) {
					if (player) player.say("You must specify 1 Pokemon.");
					return false;
				}

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
					const index = game.getCardIndex(pokemon.name, hand);
					if (index === -1) {
						if (player) player.say("You do not have [ " + pokemon.name + " ].");
						return false;
					}

					if (hand[index].action) {
						if (player) player.say("You cannot pass an action card.");
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
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game, hand) {
				const cards = game.shuffle(hand);
				for (const card of cards) {
					if (this.isPlayableTarget(game, [card.name], hand)) {
						return this.name + ", " + card.name;
					}
				}
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				if (targets.length !== 1) {
					if (player) player.say("You must specify 1 Pokemon.");
					return false;
				}

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
					const index = game.getCardIndex(pokemon.name, hand);
					if (index === -1) {
						if (player) player.say("You do not have [ " + pokemon.name + " ].");
						return false;
					}

					if (hand[index].action) {
						if (player) player.say("You cannot switch an action card.");
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
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game) {
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
				if (targets.length !== 1) {
					if (player) player.say("You must specify 1 type.");
					return false;
				}

				const type = Tools.toId(targets[0]);
				if (!type) {
					if (player) player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [type]``");
					return false;
				}

				if (!(type in data.usableTypes)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[0]]));
					return false;
				}

				if (game.topCard.types.length === 1 && data.usableTypes[type] === game.topCard.types[0]) {
					if (player) player.say("The top card is already " + data.usableTypes[type] + " type.");
					return false;
				}

				return true;
			},
		},
		"conversion2": {
			name: "Conversion 2",
			description: "Change to 2 types",
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game) {
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
				if (targets.length !== 2) {
					if (player) player.say("You must specify 2 types.");
					return false;
				}

				const type1 = Tools.toId(targets[0]);
				const type2 = Tools.toId(targets[1]);
				if (!type1 || !type2) {
					if (player) player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [type 1], [type 2]``");
					return false;
				}

				if (!(type1 in data.usableTypes)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[0]]));
					return false;
				}

				if (!(type2 in data.usableTypes)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[1]]));
					return false;
				}

				if (type1 === type2) {
					if (player) player.say("Please enter two unique types.");
					return false;
				}

				if (game.topCard.types.length === 2) {
					const typesList = [data.usableTypes[type1], data.usableTypes[type2]];
					if (game.topCard.types.slice().sort().join(",") === typesList.sort().join(",")) {
						if (player) player.say("The top card is already " + typesList.join("/") + " type.");
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
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game) {
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
			getCard(game) {
				return game.moveToActionCard(this);
			},
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
			getCard(game) {
				return game.moveToActionCard(this);
			},
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
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget() {
				return this.name;
			},
			isPlayableTarget() {
				return true;
			},
		},
	};
	finitePlayerCards = false;
	hackmonsTypes: boolean = false;
	lives = new Map<Player, number>();
	maxLateJoinRound: number = 1;
	maxPlayers = 20;
	playableCardDescription = "You must play a card that resists the top card.";
	roundDrawAmount: number = 1;
	shinyCardAchievement = ShucklesDefenseCards.achievements.luckofthedraw;
	skippedPlayerAchievement = ShucklesDefenseCards.achievements.redshell;
	skippedPlayerAchievementAmount = redShellEliminations;
	showPlayerCards = false;
	startingLives: number = 1;

	static loadData(): void {
		for (const key of Dex.data.typeKeys) {
			const type = Dex.getExistingType(key);
			data.usableTypes[type.id] = type.name;
			data.usableTypes[type.id + 'type'] = type.name;
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
		if (this.hasNoResistances(pokemon.types)) return false;
		return true;
	}

	filterForme(forme: IPokemon): boolean {
		const baseSpecies = Dex.getExistingPokemon(forme.baseSpecies);
		if (!Tools.compareArrays(baseSpecies.types, forme.types) &&
			!(baseSpecies.name === "Arceus" || baseSpecies.name === "Silvally")) return true;
		return false;
	}

	createDeckPool(): void {
		this.deckPool = [];

		let pokemonList: readonly IPokemon[];
		if (this.hackmonsTypes) {
			const list: IPokemon[] = [];
			for (const key of Dex.data.pokemonKeys) {
				const pokemon = Dex.getExistingPokemon(key);
				if (pokemon.id in this.actionCards || !Dex.hasGifData(pokemon)) continue;
				list.push(pokemon);
			}
			pokemonList = list;
		} else {
			pokemonList = Games.getPokemonList(pokemon => this.filterPokemonList(pokemon));
		}

		for (const pokemon of pokemonList) {
			const card = this.pokemonToCard(pokemon);
			if (this.hackmonsTypes) {
				card.types = this.getHackmonsTyping(card.types);
			}
			this.deckPool.push(card);
		}
	}

	createDeck(): void {
		const resistancesCounts: Dict<number> = {};
		if (!this.deckPool.length) this.createDeckPool();
		const deckPool = this.shuffle(this.deckPool);
		const deck: ICard[] = [];
		const minimumDeck = (this.maxPlayers + 1) * this.format.options.cards;
		for (const card of deckPool) {
			const resistances = Dex.getResistances(Dex.getExistingPokemon(card.name)).join(",");
			if (resistances in resistancesCounts && resistancesCounts[resistances] >= this.format.options.cards) continue;
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

	getHackmonsTyping(originalTypes: readonly string[]): readonly string[] {
		const originalKey = this.getTypingKey(originalTypes);
		const typeKeys = this.shuffle(Dex.data.typeKeys);

		let newTypes: string[] = [];
		let newKey = '';
		while (!newKey || newKey === originalKey || this.hasNoResistances(newTypes)) {
			if (this.random(2)) {
				newTypes = [Dex.getExistingType(typeKeys[0]).name, Dex.getExistingType(typeKeys[1]).name];
			} else {
				newTypes = [Dex.getExistingType(typeKeys[0]).name];
			}
			newKey = this.getTypingKey(newTypes);
		}

		return newTypes;
	}

	getCardChatDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card);
	}

	getCardPmDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card);
	}

	hasNoResistances(types: readonly string[]): boolean {
		let noResistances = true;
		for (const key of Dex.data.typeKeys) {
			const type = Dex.getExistingType(key).name;
			if (!Dex.isImmune(type, types) && Dex.getEffectiveness(type, types) < 0) {
				noResistances = false;
				break;
			}
		}

		return noResistances;
	}

	isStaleTopCard(): boolean {
		return this.hasNoResistances(this.topCard.types);
	}

	checkTopCardStaleness(message?: string): void {
		if (this.isStaleTopCard()) {
			this.say(message || this.topCard.name + " no longer has any resistances!");
			let topCard = this.getCard();
			while (topCard.action) {
				topCard = this.getCard();
			}
			this.topCard = topCard as IPokemonCard;
		}
	}

	isPlayableCard(card: ICard, otherCard?: ICard): boolean {
		if (card === this.topCard || card === otherCard || !this.isPokemonCard(card)) return false;
		if (!otherCard) otherCard = this.topCard;
		if (!this.isPokemonCard(otherCard)) return false;

		let valid = false;
		for (const type of otherCard.types) {
			if (Dex.isImmune(type, card.types)) {
				continue;
			} else {
				const effectiveness = Dex.getEffectiveness(type, card.types);
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
		if (!card.action.isPlayableTarget(this, targets, cards, player)) return false;

		const id = card.id as ActionCardNames;
		let firstTimeShiny = false;
		let drawCards: ICard[] | null = null;
		let cardDetail: string | undefined;
		if (id === 'acidarmor') {
			const topCardTypes = this.topCard.types.slice();
			topCardTypes.push("Poison");
			this.topCard.types = topCardTypes;
			this.checkTopCardStaleness();
		} else if (id === 'irondefense') {
			const topCardTypes = this.topCard.types.slice();
			topCardTypes.push("Steel");
			this.topCard.types = topCardTypes;
			this.checkTopCardStaleness();
		} else if (id === 'conversion') {
			const type = Tools.toId(targets[0]);
			this.topCard.types = [data.usableTypes[type]];
			cardDetail = data.usableTypes[type];
		} else if (id === 'conversion2') {
			const type1 = Tools.toId(targets[0]);
			const type2 = Tools.toId(targets[1]);
			this.topCard.types = [data.usableTypes[type1], data.usableTypes[type2]];
			cardDetail = data.usableTypes[type1] + ", " + data.usableTypes[type2];

			this.checkTopCardStaleness();
		} else if (id === 'transform') {
			const newTopCard = this.pokemonToCard(Dex.getExistingPokemon(targets[0]));
			if (this.hackmonsTypes) {
				newTopCard.types = this.getHackmonsTyping(newTopCard.types);
			}
			if (this.rollForShinyPokemon()) {
				newTopCard.shiny = true;
				firstTimeShiny = true;
			}
			this.setTopCard(newTopCard, player);
			cardDetail = newTopCard.name;

			this.checkTopCardStaleness(this.topCard.name + " has no resistances! Randomly selecting a different Pokemon...");
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
				if (cards[i].name === pokemon.name) {
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
			this.updatePlayerHtmlPage(player, drawnCards);
		}

		return true;
	}
}

const tests: GameFileTests<ShucklesDefenseCards> = {
	'it should use card types in isPlayableCard()': {
		test(game): void {
			if (game.hackmonsTypes) return;

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
			if (game.hackmonsTypes) return;

			const acidarmor = game.actionCards.acidarmor;
			assert(acidarmor);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(acidarmor.getAutoPlayTarget(game, []));
			assertStrictEqual(acidarmor.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(!acidarmor.getAutoPlayTarget(game, []));
			assertStrictEqual(acidarmor.isPlayableTarget(game, []), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Ekans"));
			assert(!acidarmor.getAutoPlayTarget(game, []));
			assertStrictEqual(acidarmor.isPlayableTarget(game, []), false);
		},
	},
	'action cards - batonpass': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const batonpass = game.actionCards.batonpass;
			assert(batonpass);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			let hand = [game.pokemonToCard(Dex.getExistingPokemon("Squirtle"))];
			assert(batonpass.getAutoPlayTarget(game, hand));
			assertStrictEqual(batonpass.isPlayableTarget(game, ["Squirtle"], hand), true);
			assertStrictEqual(batonpass.isPlayableTarget(game, ["Charmander"], hand), false);
			assertStrictEqual(batonpass.isPlayableTarget(game, [""], hand), false);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"))];
			assert(!batonpass.getAutoPlayTarget(game, hand));
			assertStrictEqual(batonpass.isPlayableTarget(game, ["Bulbasaur"], hand), false);
		},
	},
	'action cards - allyswitch': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const allyswitch = game.actionCards.allyswitch;
			assert(allyswitch);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			let hand = [game.pokemonToCard(Dex.getExistingPokemon("Squirtle"))];
			assert(allyswitch.getAutoPlayTarget(game, hand));
			assertStrictEqual(allyswitch.isPlayableTarget(game, ["Squirtle"], hand), true);
			assertStrictEqual(allyswitch.isPlayableTarget(game, ["Charmander"], hand), false);
			assertStrictEqual(allyswitch.isPlayableTarget(game, [""], hand), false);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"))];
			assert(!allyswitch.getAutoPlayTarget(game, hand));
			assertStrictEqual(allyswitch.isPlayableTarget(game, ["Bulbasaur"], hand), false);
		},
	},
	'action cards - conversion': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const conversion = game.actionCards.conversion;
			assert(conversion);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(conversion.getAutoPlayTarget(game, []));
			assertStrictEqual(conversion.isPlayableTarget(game, ["Grass"]), true);
			assertStrictEqual(conversion.isPlayableTarget(game, ["Poison"]), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(conversion.getAutoPlayTarget(game, []));
			assertStrictEqual(conversion.isPlayableTarget(game, ["Grass"]), true);
			assertStrictEqual(conversion.isPlayableTarget(game, ["Water"]), false);
			assertStrictEqual(conversion.isPlayableTarget(game, [""]), false);
			assertStrictEqual(conversion.isPlayableTarget(game, ["Grass", "Fire"]), false);
		},
	},
	'action cards - conversion2': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const conversion2 = game.actionCards['conversion2'];
			assert(conversion2);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(conversion2.getAutoPlayTarget(game, []));
			assertStrictEqual(conversion2.isPlayableTarget(game, ["Water", "Fire"]), true);
			assertStrictEqual(conversion2.isPlayableTarget(game, ["Grass", "Poison"]), false);
			assertStrictEqual(conversion2.isPlayableTarget(game, ["Poison", "Grass"]), false);
			assertStrictEqual(conversion2.isPlayableTarget(game, ["Water"]), false);
			assertStrictEqual(conversion2.isPlayableTarget(game, [""]), false);
		},
	},
	'action cards - transform': {
		test(game): void {
			if (game.hackmonsTypes) return;
			game.createDeckPool();

			const transform = game.actionCards.transform;
			assert(transform);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(transform.getAutoPlayTarget(game, []));
			assertStrictEqual(transform.isPlayableTarget(game, ["Squirtle"]), true);
			assertStrictEqual(transform.isPlayableTarget(game, ["Bulbasaur"]), false);
			assertStrictEqual(transform.isPlayableTarget(game, [""]), false);
		},
	},
	'action cards - protect': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const protect = game.actionCards.protect;
			assert(protect);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(protect.getAutoPlayTarget(game, []));
			assertStrictEqual(protect.isPlayableTarget(game, []), true);
		},
	},
	'action cards - teeterdance': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const teeterdance = game.actionCards.teeterdance;
			assert(teeterdance);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(teeterdance.getAutoPlayTarget(game, []));
			assertStrictEqual(teeterdance.isPlayableTarget(game, []), true);
		},
	},
	'action cards - topsyturvy': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const topsyturvy = game.actionCards.topsyturvy;
			assert(topsyturvy);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(topsyturvy.getAutoPlayTarget(game, []));
			assertStrictEqual(topsyturvy.isPlayableTarget(game, []), true);
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
	tests,
	variants: [
		{
			name: "Hackmons Shuckle's Defense Cards",
			variantAliases: ["Hackmons", "Hackmons Cup"],
			hackmonsTypes: true,
		},
	],
});
