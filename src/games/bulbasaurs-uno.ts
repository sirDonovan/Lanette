import type { Player } from "../room-activity";
import { addPlayer, assert, assertStrictEqual } from "../test/test-tools";
import type { GameCommandDefinitions, GameFileTests, IGameAchievement, IGameFile } from "../types/games";
import type { IActionCardData, ICard, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

type AchievementNames = "drawwizard" | "luckofthedraw";
type ActionCardNames = 'greninja' | 'kecleon' | 'magnemite' | 'doduo' | 'machamp' | 'inkay' | 'slaking' | 'spinda';
type ActionCardsType = KeyedDict<ActionCardNames, IActionCardData<BulbasaursUno>>;

const drawWizardAmount = 6;

class BulbasaursUno extends CardMatching<ActionCardsType> {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"drawwizard": {name: "Draw Wizard", type: 'special', bits: 1000, description: 'play a card that forces the next ' +
			drawWizardAmount + ' or more players to draw a card'},
		"luckofthedraw": {name: "Luck of the Draw", type: 'shiny', bits: 1000, repeatBits: 250, description:'draw and play a shiny card'},
	};

	actionCards: ActionCardsType = {
		"greninja": {
			name: "Greninja",
			description: "Change to 1 type",
			requiredTarget: true,
			getCard(game) {
				return game.pokemonToActionCard(this);
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
		"kecleon": {
			name: "Kecleon",
			description: "Change color",
			requiredTarget: true,
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getRandomTarget(game, player, cardsSubset) {
				const colors = Dex.getData().colors;
				const colorKeys = game.shuffle(Object.keys(colors));
				let usableColor: string | undefined;
				for (const colorKey of colorKeys) {
					const colorName = colors[colorKey];
					if (!this.getTargetErrors(game, [colorName], player, cardsSubset)) {
						usableColor = colorName;
						break;
					}
				}

				if (!usableColor) return;
				return this.name + ", " + usableColor;
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				return this.getRandomTarget!(game, player, cardsSubset);
			},
			getTargetErrors(game, targets) {
				if (targets.length !== 1) {
					return "You must specify 1 color.";
				}

				const color = Tools.toId(targets[0]);
				if (!color) {
					return "Usage: ``" + Config.commandCharacter + "play " + this.name + ", [color]``";
				}

				const colors = Dex.getData().colors;
				if (!(color in colors)) {
					return "'" + targets[0].trim() + "' is not a valid color.";
				}

				if (game.topCard.color === colors[color]) {
					return "The top card is already " + colors[color] + ".";
				}
			},
		},
		"magnemite": {
			name: "Magnemite",
			description: "Pair and play 2 Pokemon",
			requiredTarget: true,
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getRandomTarget(game, player, cardsSubset) {
				const cards = cardsSubset || game.playerCards.get(player);
				if (cards && cards.length >= 3) {
					const shuffledCards = game.shuffle(cards);
					for (const cardA of shuffledCards) {
						for (const cardB of shuffledCards) {
							// @ts-expect-error
							if (cardA === cardB || cardA === this || cardB === this) continue;
							if (!this.getTargetErrors(game, [cardA.name, cardB.name], player, cardsSubset)) {
								return this.name + ", " + cardA.name + ", " + cardB.name;
							}
						}
					}
				} else if (cards) {
					for (const card of cards) {
						// @ts-expect-error
						if (card === this) continue;
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
				const cards = cardsSubset || game.playerCards.get(player);
				if (cards && cards.length >= 3) {
					if (targets.length != 2) {
						return "You must specify 2 other Pokemon to pair.";
					}

					const pokemonA = Dex.getPokemon(targets[0]);
					if (!pokemonA) {
						return CommandParser.getErrorText(['invalidPokemon', targets[0]]);
					}

					const pokemonB = Dex.getPokemon(targets[1]);
					if (!pokemonB) {
						return CommandParser.getErrorText(['invalidPokemon', targets[1]]);
					}

					const names = [pokemonA.name, pokemonB.name];
					const indices = game.getCardIndices(names, cards);
					for (let i = 0; i < indices.length; i++) {
						if (indices[i] === -1) {
							return "You do not have [ " + names[i] + " ].";
						}
					}

					const cardA = cards[indices[0]];
					const cardB = cards[indices[1]];
					if (cardA.action || cardB.action) {
						return "You cannot pair action cards.";
					}

					if (!game.isPokemonCard(cardA) || !game.isPokemonCard(cardB) || !game.isPlayableCard(cardA, cardB)) {
						return "Please input a valid pair (matching color or type).";
					}

					const newTopCards = [];
					if (game.isPlayableCard(cardA, game.topCard)) newTopCards.push(cardA);
					if (game.isPlayableCard(cardB, game.topCard)) newTopCards.push(cardA);
					if (!newTopCards.length) {
						return "You must play a card that matches color or a type with the top card.";
					}
				} else if (cards) {
					if (targets.length != 1) {
						return "You must include your other card.";
					}

					const pokemon = Dex.getPokemon(targets[0]);
					if (!pokemon) {
						return CommandParser.getErrorText(['invalidPokemon', targets[0]]);
					}

					const index = game.getCardIndex(pokemon.name, cards);
					if (index === -1) {
						return "You do not have [ " + pokemon.name + " ].";
					}

					const card = cards[index];
					if (!game.isPokemonCard(card) || !game.isPlayableCard(card, game.topCard)) {
						return game.playableCardDescription;
					}
				}
			},
		},
		"doduo": {
			name: "Doduo",
			description: "Make the next player draw 2",
			drawCards: 2,
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getAutoPlayTarget() {
				return this.name;
			},
			getTargetErrors() {
				return "";
			},
		},
		"machamp": {
			name: "Machamp",
			description: "Make the next player draw 4",
			drawCards: 4,
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getAutoPlayTarget() {
				return this.name;
			},
			getTargetErrors() {
				return "";
			},
		},
		"inkay": {
			name: "Inkay",
			description: "Reverse the turn order",
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getAutoPlayTarget() {
				return this.name;
			},
			getTargetErrors() {
				return "";
			},
		},
		"slaking": {
			name: "Slaking",
			description: "Skip the next player's turn",
			skipPlayers: 1,
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getAutoPlayTarget() {
				return this.name;
			},
			getTargetErrors() {
				return "";
			},
		},
		"spinda": {
			name: "Spinda",
			description: "Shuffle the player order",
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getAutoPlayTarget() {
				return this.name;
			},
			getTargetErrors() {
				return "";
			},
		},
	};
	colorsLimit: number = 20;
	finitePlayerCards: boolean = true;
	maximumPlayedCards: number = 1;
	playerCards = new Map<Player, IPokemonCard[]>();
	shinyCardAchievement = BulbasaursUno.achievements.luckofthedraw;
	skippedPlayerAchievement = BulbasaursUno.achievements.drawwizard;
	skippedPlayerAchievementAmount = drawWizardAmount;
	typesLimit: number = 20;
	usableTypes: Dict<string> = {};
	usesColors: boolean = true;

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
			if (this.topCard.action && this.topCard.action.drawCards) {
				delete this.topCard.action;
			}
			this.nextRound();
		}
	}

	alterCard(dex: typeof Dex, card: IPokemonCard): IPokemonCard {
		if (this.deltaTypes) {
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

	playActionCard(card: IPokemonCard, player: Player, targets: string[], cards: IPokemonCard[]): boolean {
		if (!card.action) throw new Error("playActionCard called with a regular card");
		if (card.action.getTargetErrors(this, targets, player, cards)) return false;

		const id = card.id as ActionCardNames;
		let firstTimeShiny = false;
		let cardDetail: string | undefined;
		let drawCards = 0;
		if (this.topCard.action && this.topCard.action.drawCards) {
			drawCards = this.topCard.action.drawCards;
		}
		if (card.action.drawCards) {
			if (this.topCard.action && this.topCard.action.drawCards) {
				this.topCard.action.drawCards += card.action.drawCards;
			} else {
				this.topCard.action = card.action;
			}
			this.say("The top card is now **Draw " + this.topCard.action.drawCards + "**!");
			drawCards = 0;
		} else if (id === 'greninja') {
			const type = Tools.toId(targets[0]);
			this.topCard.types = [this.usableTypes[type]];
			cardDetail = this.usableTypes[type];
		} else if (id === 'kecleon') {
			const color = Tools.toId(targets[0]);
			this.topCard.color = this.colors[color];
			cardDetail = this.colors[color];
		} else if (id === 'inkay') {
			this.say("**The turn order was reversed!**");
			this.playerOrder.reverse();
			const playerIndex = this.playerOrder.indexOf(player);
			this.playerList = this.playerOrder.slice(playerIndex + 1);
		} else if (id === 'spinda') {
			this.say("**The turn order was shuffled!**");
			this.playerOrder = this.shuffle(this.playerOrder);
			let index = this.playerOrder.indexOf(player) + 1;
			if (index === this.playerOrder.length) index = 0;
			this.playerList = this.playerOrder.slice(index);
		} else if (id === 'slaking') {
			this.topCard.action = card.action;
		} else if (id === 'magnemite') {
			if (cards.length >= 3) {
				const idA = Dex.getExistingPokemon(targets[0]).id;
				const idB = Dex.getExistingPokemon(targets[1]).id;
				let indexA = -1;
				let indexB = -1;
				for (let i = 0; i < cards.length; i++) {
					if (cards[i].id === idA) {
						indexA = i;
						continue;
					}
					if (cards[i].id === idB) {
						indexB = i;
						continue;
					}
				}

				const cardA = cards[indexA];
				const cardB = cards[indexB];
				const newTopCards = [];
				if (this.isPlayableCard(cardA, this.topCard)) newTopCards.push(cardA);
				if (this.isPlayableCard(cardB, this.topCard)) newTopCards.push(cardA);

				const newTopCard = this.sampleOne(newTopCards);
				if (newTopCard.shiny && !newTopCard.played) firstTimeShiny = true;
				this.setTopCard(newTopCard, player);

				cards.splice(indexA, 1);
				indexB = cards.indexOf(cardB);
				cards.splice(indexB, 1);
				cardDetail = cardA.name + ", " + cardB.name;
			} else {
				const idA = Dex.getExistingPokemon(targets[0]).id;
				let indexA = -1;
				for (let i = 0; i < cards.length; i++) {
					if (cards[i].id === idA) {
						indexA = i;
						break;
					}
				}

				const cardA = cards[indexA];
				if (cardA.shiny && !cardA.played) firstTimeShiny = true;
				this.setTopCard(cardA, player);
				cards.splice(indexA, 1);
				cardDetail = cardA.name;
			}
		}

		this.awaitingCurrentPlayerCard = false;
		if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);

		this.storePreviouslyPlayedCard({card: card.name, player: player.name, detail: cardDetail, shiny: firstTimeShiny});
		this.currentPlayer = null;

		let drawnCards: ICard[] | undefined;
		if (drawCards > 0) {
			if (!player.eliminated) drawnCards = this.drawCard(player, drawCards);
			if (this.topCard.action && this.topCard.action.drawCards) delete this.topCard.action;
		}

		if (!player.eliminated) {
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

const commands: GameCommandDefinitions<BulbasaursUno> = {
	draw: {
		command(target, room, user) {
			if (!this.canPlay || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
			this.awaitingCurrentPlayerCard = false;
			this.currentPlayer = null; // prevent Draw Wizard from activating on a draw
			const drawnCards = this.drawCard(this.players[user.id]);
			const htmlPage = this.getHtmlPage(this.players[user.id]);
			htmlPage.renderCardActionsHtml();
			htmlPage.renderDrawnCardsHtml(drawnCards);
			htmlPage.renderHandHtml();
			htmlPage.send();

			this.nextRound();
			return true;
		},
		chatOnly: true,
	},
};

const tests: GameFileTests<BulbasaursUno> = {
	'action cards - greninja': {
		test(game): void {
			const greninja = game.actionCards.greninja;
			assert(greninja);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(greninja.getAutoPlayTarget(game, player));
			assertStrictEqual(!greninja.getTargetErrors(game, ["Grass"], player), true);
			assertStrictEqual(!greninja.getTargetErrors(game, ["Poison"], player), true);
			assertStrictEqual(!greninja.getTargetErrors(game, ["Water", "Fire"], player), false);
			assertStrictEqual(!greninja.getTargetErrors(game, [""], player), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(greninja.getAutoPlayTarget(game, player));
			assertStrictEqual(!game.actionCards.greninja.getTargetErrors(game, ["Water"], player), false);
			assertStrictEqual(!game.actionCards.greninja.getTargetErrors(game, ["Fire"], player), true);
		},
	},
	'action cards - kecleon': {
		test(game): void {
			const kecleon = game.actionCards.kecleon;
			assert(kecleon);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(kecleon.getAutoPlayTarget(game, player));
			assertStrictEqual(!kecleon.getTargetErrors(game, ["Red"], player), true);
			assertStrictEqual(!kecleon.getTargetErrors(game, ["Green"], player), false);
			assertStrictEqual(!kecleon.getTargetErrors(game, ["Red", "Yellow"], player), false);
			assertStrictEqual(!kecleon.getTargetErrors(game, [""], player), false);
		},
	},
	'action cards - magnemite': {
		test(game): void {
			const magnemite = game.actionCards.magnemite;
			assert(magnemite);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			let hand = [game.pokemonToCard(Dex.getExistingPokemon("Magnemite")), game.pokemonToCard(Dex.getExistingPokemon("Ivysaur"))];
			assert(magnemite.getAutoPlayTarget(game, player, hand));
			assertStrictEqual(!game.actionCards.magnemite.getTargetErrors(game, ["Ivysaur"], player, hand), true);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Magnemite")), game.pokemonToCard(Dex.getExistingPokemon("Squirtle"))];
			assert(!magnemite.getAutoPlayTarget(game, player, hand));
			assertStrictEqual(!game.actionCards.magnemite.getTargetErrors(game, ["Squirtle"], player, hand), false);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Magnemite")), game.pokemonToCard(Dex.getExistingPokemon("Ivysaur")),
				game.pokemonToCard(Dex.getExistingPokemon("Venusaur"))];
			assert(magnemite.getAutoPlayTarget(game, player, hand));
			assertStrictEqual(!game.actionCards.magnemite.getTargetErrors(game, ["Ivysaur", "Venusaur"], player, hand), true);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Magnemite")), game.pokemonToCard(Dex.getExistingPokemon("Squirtle")),
				game.pokemonToCard(Dex.getExistingPokemon("Charmander"))];
			assert(!magnemite.getAutoPlayTarget(game, player, hand));
			assertStrictEqual(!game.actionCards.magnemite.getTargetErrors(game, ["Ivysaur", "Venusaur"], player, hand), false);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Magnemite")), game.pokemonToCard(Dex.getExistingPokemon("Ivysaur")),
				game.pokemonToCard(Dex.getExistingPokemon("Squirtle"))];
			assert(!magnemite.getAutoPlayTarget(game, player, hand));
			assertStrictEqual(!game.actionCards.magnemite.getTargetErrors(game, ["Ivysaur", "Squirtle"], player, hand), false);
		},
	},
	'action cards - doduo': {
		test(game): void {
			const doduo = game.actionCards.doduo;
			assert(doduo);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(doduo.getAutoPlayTarget(game, player));
			assertStrictEqual(!doduo.getTargetErrors(game, [], player), true);
		},
	},
	'action cards - machamp': {
		test(game): void {
			const machamp = game.actionCards.machamp;
			assert(machamp);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(machamp.getAutoPlayTarget(game, player));
			assertStrictEqual(!machamp.getTargetErrors(game, [], player), true);
		},
	},
	'action cards - inkay': {
		test(game): void {
			const inkay = game.actionCards.inkay;
			assert(inkay);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(inkay.getAutoPlayTarget(game, player));
			assertStrictEqual(!inkay.getTargetErrors(game, [], player), true);
		},
	},
	'action cards - slaking': {
		test(game): void {
			const slaking = game.actionCards.slaking;
			assert(slaking);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(slaking.getAutoPlayTarget(game, player));
			assertStrictEqual(!slaking.getTargetErrors(game, [], player), true);
		},
	},
	'action cards - spinda': {
		test(game): void {
			const spinda = game.actionCards.spinda;
			assert(spinda);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(spinda.getAutoPlayTarget(game, player));
			assertStrictEqual(!spinda.getTargetErrors(game, [], player), true);
		},
	},
};

export const game: IGameFile<BulbasaursUno> = Games.copyTemplateProperties(cardGame, {
	aliases: ["bulbasaurs", "uno", "bu"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon]", Config.commandCharacter + "draw"],
	commands: Object.assign((Tools.deepClone(cardGame.commands) as unknown) as GameCommandDefinitions<BulbasaursUno>, commands),
	class: BulbasaursUno,
	description: "Each round, players can play a card that matches the type or color of the top card or draw a new card. " +
		"<a href='http://psgc.weebly.com/pokeuno.html'>Action card descriptions</a>",
	formerNames: ["Pokeuno"],
	name: "Bulbasaur's Uno",
	mascot: "Bulbasaur",
	scriptedOnly: true,
	tests: Object.assign({}, cardGame.tests, tests),
	variants: [
		{
			name: "Delta Species Bulbasaur's Uno",
			variantAliases: ["delta species", "delta"],
			deltaTypes: true,
		},
		{
			name: "Bulbasaur's Kanto Uno",
			variantAliases: ["kanto", "gen1"],
			requiredGen: 1,
			maxPlayers: 20,
		},
		{
			name: "Bulbasaur's Johto Uno",
			variantAliases: ["johto", "gen2"],
			requiredGen: 2,
			maxPlayers: 16,
		},
		{
			name: "Bulbasaur's Hoenn Uno",
			variantAliases: ["hoenn", "gen3"],
			requiredGen: 3,
			maxPlayers: 20,
		},
		{
			name: "Bulbasaur's Sinnoh Uno",
			variantAliases: ["sinnoh", "gen4"],
			requiredGen: 4,
			maxPlayers: 19,
		},
		{
			name: "Bulbasaur's Unova Uno",
			variantAliases: ["unova", "gen5"],
			requiredGen: 5,
			maxPlayers: 20,
		},
		{
			name: "Bulbasaur's Kalos Uno",
			variantAliases: ["kalos", "gen6"],
			requiredGen: 6,
			maxPlayers: 14,
		},
		{
			name: "Bulbasaur's Alola Uno",
			variantAliases: ["alola", "gen7"],
			requiredGen: 7,
			maxPlayers: 19,
		},
		{
			name: "Bulbasaur's Galar Uno",
			variantAliases: ["galar", "gen8"],
			requiredGen: 8,
			maxPlayers: 18,
		},
		{
			name: "Bulbasaur's Paldea Uno",
			variantAliases: ["paldea", "gen9"],
			requiredGen: 9,
			maxPlayers: 18,
		},
	],
});
