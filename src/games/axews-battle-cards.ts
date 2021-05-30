import type { Player } from "../room-activity";
import { assert, assertStrictEqual } from "../test/test-tools";
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
			getAutoPlayTarget(game) {
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
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game) {
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
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game) {
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
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game) {
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

				if (game.topCard.id === pokemon.id) {
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

				if (game.topCard.id === pokemon.id) {
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
				const dex = game.getDex();
				const typeKeys = dex.getData().typeKeys;
				let targets: string[] = [dex.getExistingType(game.sampleOne(typeKeys)).name];
				while (!this.isPlayableTarget(game, targets)) {
					targets = [dex.getExistingType(game.sampleOne(typeKeys)).name];
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

				if (!(type in game.usableTypes)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[0]]));
					return false;
				}

				if (game.topCard.types.length === 1 && game.usableTypes[type] === game.topCard.types[0]) {
					if (player) player.say("The top card is already " + game.usableTypes[type] + " type.");
					return false;
				}

				return true;
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
			getRandomTarget(game) {
				const dex = game.getDex();
				const typeKeys = dex.getData().typeKeys;
				let types = game.sampleMany(typeKeys, 2).map(x => dex.getExistingType(x).name);
				while (!this.isPlayableTarget(game, types)) {
					types = game.sampleMany(typeKeys, 2).map(x => dex.getExistingType(x).name);
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

				if (!(type1 in game.usableTypes)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[0]]));
					return false;
				}

				if (!(type2 in game.usableTypes)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[1]]));
					return false;
				}

				if (type1 === type2) {
					if (player) player.say("Please enter two unique types.");
					return false;
				}

				if (game.topCard.types.length === 2) {
					const typesList = [game.usableTypes[type1], game.usableTypes[type2]];
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
					if (card.id === pokemon.id) {
						deckHasSpecies = true;
						break;
					}
				}

				if (!deckHasSpecies) {
					if (player) player.say(pokemon.name + " is not playable in this game.");
					return false;
				}

				if (game.topCard.id === pokemon.id) {
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
		if (!this.deckPool.length) this.createDeckPool();
		const deckPool = this.shuffle(this.deckPool);
		const deck: ICard[] = [];
		const dex = this.getDex();
		const minimumDeck = (this.playerCount + 1) * this.format.options.cards;
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

	isStaleTopCard(): boolean {
		return this.hasNoWeaknesses(this.getDex(), this.topCard.types);
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
		if (!card.action.isPlayableTarget(this, targets, cards, player)) return false;

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

			this.checkTopCardStaleness();
		} else if (id === 'trickortreat') {
			const topCardTypes = this.topCard.types.slice();
			topCardTypes.push("Ghost");
			this.topCard.types = topCardTypes;
			this.checkTopCardStaleness();
		} else if (id === 'forestscurse') {
			const topCardTypes = this.topCard.types.slice();
			topCardTypes.push("Grass");
			this.topCard.types = topCardTypes;
			this.checkTopCardStaleness();
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
			this.sendPlayerCards(player, drawnCards);
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

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(soak.getAutoPlayTarget(game, []));
			assertStrictEqual(soak.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Poliwrath"));
			assert(soak.getAutoPlayTarget(game, []));
			assertStrictEqual(soak.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(!soak.getAutoPlayTarget(game, []));
			assertStrictEqual(soak.isPlayableTarget(game, []), false);
		},
	},
	'action cards - trickortreat': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const trickortreat = game.actionCards.trickortreat;
			assert(trickortreat);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(trickortreat.getAutoPlayTarget(game, []));
			assertStrictEqual(trickortreat.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Gastly"));
			assert(!trickortreat.getAutoPlayTarget(game, []));
			assertStrictEqual(trickortreat.isPlayableTarget(game, []), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Duskull"));
			assert(!trickortreat.getAutoPlayTarget(game, []));
			assertStrictEqual(trickortreat.isPlayableTarget(game, []), false);
		},
	},
	'action cards - forestscurse': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const forestscurse = game.actionCards.forestscurse;
			assert(forestscurse);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(forestscurse.getAutoPlayTarget(game, []));
			assertStrictEqual(forestscurse.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(!forestscurse.getAutoPlayTarget(game, []));
			assertStrictEqual(forestscurse.isPlayableTarget(game, []), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Tangela"));
			assert(!forestscurse.getAutoPlayTarget(game, []));
			assertStrictEqual(forestscurse.isPlayableTarget(game, []), false);
		},
	},
	'action cards - magicpowder': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const magicpowder = game.actionCards.magicpowder;
			assert(magicpowder);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(magicpowder.getAutoPlayTarget(game, []));
			assertStrictEqual(magicpowder.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Slowpoke"));
			assert(magicpowder.getAutoPlayTarget(game, []));
			assertStrictEqual(magicpowder.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Abra"));
			assert(!magicpowder.getAutoPlayTarget(game, []));
			assertStrictEqual(magicpowder.isPlayableTarget(game, []), false);
		},
	},
	'action cards - batonpass': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

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
			if (game.deltaTypes || game.hackmonsTypes) return;

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
			if (game.deltaTypes || game.hackmonsTypes) return;

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
			if (game.deltaTypes || game.hackmonsTypes) return;

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
			if (game.deltaTypes || game.hackmonsTypes || game.requiredGen) return;
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
			if (game.deltaTypes || game.hackmonsTypes) return;

			const protect = game.actionCards.protect;
			assert(protect);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(protect.getAutoPlayTarget(game, []));
			assertStrictEqual(protect.isPlayableTarget(game, []), true);
		},
	},
	'action cards - teeterdance': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const teeterdance = game.actionCards.teeterdance;
			assert(teeterdance);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(teeterdance.getAutoPlayTarget(game, []));
			assertStrictEqual(teeterdance.isPlayableTarget(game, []), true);
		},
	},
	'action cards - topsyturvy': {
		test(game): void {
			if (game.deltaTypes || game.hackmonsTypes) return;

			const topsyturvy = game.actionCards.topsyturvy;
			assert(topsyturvy);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(topsyturvy.getAutoPlayTarget(game, []));
			assertStrictEqual(topsyturvy.isPlayableTarget(game, []), true);
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
	],
});
