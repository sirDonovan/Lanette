import type { Player } from "../room-activity";
import { assert, assertStrictEqual } from "../test/test-tools";
import type { GameCommandDefinitions, GameFileTests, IGameAchievement, IGameFile } from "../types/games";
import type { IActionCardData, ICard, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

type AchievementNames = "drawwizard" | "luckofthedraw";
type ActionCardNames = 'greninja' | 'kecleon' | 'magnemite' | 'doduo' | 'machamp' | 'inkay' | 'slaking' | 'spinda';
type ActionCardsType = KeyedDict<ActionCardNames, IActionCardData<BulbasaursUno>>;

const types: Dict<string> = {};

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
		"kecleon": {
			name: "Kecleon",
			description: "Change color",
			requiredTarget: true,
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getRandomTarget(game) {
				let targets: string[] = [Dex.data.colors[game.sampleOne(Object.keys(Dex.data.colors))]];
				while (!this.isPlayableTarget(game, targets)) {
					targets = [Dex.data.colors[game.sampleOne(Object.keys(Dex.data.colors))]];
				}

				return this.name + ", " + targets[0];
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				if (targets.length !== 1) {
					if (player) player.say("You must specify 1 color.");
					return false;
				}

				const color = Tools.toId(targets[0]);
				if (!color) {
					if (player) player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [color]``");
					return false;
				}

				if (!(color in Dex.data.colors)) {
					if (player) player.say("'" + targets[0].trim() + "' is not a valid color.");
					return false;
				}

				if (game.topCard.color === Dex.data.colors[color]) {
					if (player) player.say("The top card is already " + Dex.data.colors[color] + ".");
					return false;
				}

				return true;
			},
		},
		"magnemite": {
			name: "Magnemite",
			description: "Pair and play 2 Pokemon",
			requiredTarget: true,
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getRandomTarget(game, hand) {
				if (hand.length >= 3) {
					const cards = game.shuffle(hand);
					for (const cardA of cards) {
						for (const cardB of cards) {
							// @ts-expect-error
							if (cardA === cardB || cardA === this || cardB === this) continue;
							if (this.isPlayableTarget(game, [cardA.name, cardB.name], hand)) {
								return this.name + ", " + cardA.name + ", " + cardB.name;
							}
						}
					}
				} else {
					for (const card of hand) {
						// @ts-expect-error
						if (card === this) continue;
						if (this.isPlayableTarget(game, [card.name], hand)) {
							return this.name + ", " + card.name;
						}
					}
				}
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				if (hand!.length >= 3) {
					if (targets.length != 2) {
						if (player) player.say("You must specify 2 other Pokemon to pair.");
						return false;
					}

					const pokemonA = Dex.getPokemon(targets[0]);
					if (!pokemonA) {
						if (player) player.say(CommandParser.getErrorText(['invalidPokemon', targets[0]]));
						return false;
					}

					const pokemonB = Dex.getPokemon(targets[1]);
					if (!pokemonB) {
						if (player) player.say(CommandParser.getErrorText(['invalidPokemon', targets[1]]));
						return false;
					}

					const names = [pokemonA.name, pokemonB.name];
					const indices = game.getCardIndices(names, hand!);
					for (let i = 0; i < indices.length; i++) {
						if (indices[i] === -1) {
							if (player) player.say("You do not have [ " + names[i] + " ].");
							return false;
						}
					}

					const cardA = hand![indices[0]];
					const cardB = hand![indices[1]];
					if (cardA.action || cardB.action) {
						if (player) player.say("You cannot pair action cards.");
						return false;
					}

					if (!game.isPokemonCard(cardA) || !game.isPokemonCard(cardB) || !game.isPlayableCard(cardA, cardB)) {
						if (player) player.say("Please input a valid pair (matching color or type).");
						return false;
					}

					const newTopCards = [];
					if (game.isPlayableCard(cardA, game.topCard)) newTopCards.push(cardA);
					if (game.isPlayableCard(cardB, game.topCard)) newTopCards.push(cardA);
					if (!newTopCards.length) {
						if (player) player.say("You must play a card that matches color or a type with the top card.");
						return false;
					}
				} else {
					if (targets.length != 1) {
						if (player) player.say("You must include your other card.");
						return false;
					}

					const pokemon = Dex.getPokemon(targets[0]);
					if (!pokemon) {
						if (player) player.say(CommandParser.getErrorText(['invalidPokemon', targets[0]]));
						return false;
					}

					const index = game.getCardIndex(pokemon.name, hand!);
					if (index === -1) {
						if (player) player.say("You do not have [ " + pokemon.name + " ].");
						return false;
					}

					const card = hand![index];
					if (!game.isPokemonCard(card) || !game.isPlayableCard(card, game.topCard)) {
						if (player) player.say(game.playableCardDescription);
						return false;
					}
				}

				return true;
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
			isPlayableTarget() {
				return true;
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
			isPlayableTarget() {
				return true;
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
			isPlayableTarget() {
				return true;
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
			isPlayableTarget() {
				return true;
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
			isPlayableTarget() {
				return true;
			},
		},
	};
	colorsLimit: number = 20;
	finitePlayerCards: boolean = true;
	playerCards = new Map<Player, IPokemonCard[]>();
	shinyCardAchievement = BulbasaursUno.achievements.luckofthedraw;
	skippedPlayerAchievement = BulbasaursUno.achievements.drawwizard;
	skippedPlayerAchievementAmount = drawWizardAmount;
	typesLimit: number = 20;
	usesColors: boolean = true;

	static loadData(): void {
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
			if (this.topCard.action && this.topCard.action.drawCards) {
				delete this.topCard.action;
			}
			this.nextRound();
		}
	}

	playActionCard(card: IPokemonCard, player: Player, targets: string[], cards: IPokemonCard[]): boolean {
		if (!card.action) throw new Error("playActionCard called with a regular card");
		if (!card.action.isPlayableTarget(this, targets, cards, player)) return false;

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
			this.topCard.types = [types[type]];
			cardDetail = types[type];
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
				const idA = Tools.toId(targets[0]);
				const idB = Tools.toId(targets[1]);
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
				const idA = Tools.toId(targets[0]);
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

		if (!player.eliminated) this.updatePlayerHtmlPage(player, drawnCards);

		return true;
	}
}

const commands: GameCommandDefinitions<BulbasaursUno> = {
	draw: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canPlay || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
			this.awaitingCurrentPlayerCard = false;
			this.currentPlayer = null; // prevent Draw Wizard from activating on a draw
			const drawnCards = this.drawCard(this.players[user.id]);
			this.updatePlayerHtmlPage(this.players[user.id], drawnCards);
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

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(greninja.getAutoPlayTarget(game, []));
			assertStrictEqual(greninja.isPlayableTarget(game, ["Grass"]), true);
			assertStrictEqual(greninja.isPlayableTarget(game, ["Poison"]), true);
			assertStrictEqual(greninja.isPlayableTarget(game, ["Water", "Fire"]), false);
			assertStrictEqual(greninja.isPlayableTarget(game, [""]), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(greninja.getAutoPlayTarget(game, []));
			assertStrictEqual(game.actionCards.greninja.isPlayableTarget(game, ["Water"]), false);
			assertStrictEqual(game.actionCards.greninja.isPlayableTarget(game, ["Fire"]), true);
		},
	},
	'action cards - kecleon': {
		test(game): void {
			const kecleon = game.actionCards.kecleon;
			assert(kecleon);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(kecleon.getAutoPlayTarget(game, []));
			assertStrictEqual(kecleon.isPlayableTarget(game, ["Red"]), true);
			assertStrictEqual(kecleon.isPlayableTarget(game, ["Green"]), false);
			assertStrictEqual(kecleon.isPlayableTarget(game, ["Red", "Yellow"]), false);
			assertStrictEqual(kecleon.isPlayableTarget(game, [""]), false);
		},
	},
	'action cards - magnemite': {
		test(game): void {
			const magnemite = game.actionCards.magnemite;
			assert(magnemite);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			let hand = [game.pokemonToCard(Dex.getExistingPokemon("Magnemite")), game.pokemonToCard(Dex.getExistingPokemon("Ivysaur"))];
			assert(magnemite.getAutoPlayTarget(game, hand));
			assertStrictEqual(game.actionCards.magnemite.isPlayableTarget(game, ["Ivysaur"], hand), true);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Magnemite")), game.pokemonToCard(Dex.getExistingPokemon("Squirtle"))];
			assert(!magnemite.getAutoPlayTarget(game, hand));
			assertStrictEqual(game.actionCards.magnemite.isPlayableTarget(game, ["Squirtle"], hand), false);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Magnemite")), game.pokemonToCard(Dex.getExistingPokemon("Ivysaur")),
				game.pokemonToCard(Dex.getExistingPokemon("Venusaur"))];
			assert(magnemite.getAutoPlayTarget(game, hand));
			assertStrictEqual(game.actionCards.magnemite.isPlayableTarget(game, ["Ivysaur", "Venusaur"], hand), true);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Magnemite")), game.pokemonToCard(Dex.getExistingPokemon("Squirtle")),
				game.pokemonToCard(Dex.getExistingPokemon("Charmander"))];
			assert(!magnemite.getAutoPlayTarget(game, hand));
			assertStrictEqual(game.actionCards.magnemite.isPlayableTarget(game, ["Ivysaur", "Venusaur"], hand), false);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Magnemite")), game.pokemonToCard(Dex.getExistingPokemon("Ivysaur")),
				game.pokemonToCard(Dex.getExistingPokemon("Squirtle"))];
			assert(!magnemite.getAutoPlayTarget(game, hand));
			assertStrictEqual(game.actionCards.magnemite.isPlayableTarget(game, ["Ivysaur", "Squirtle"], hand), false);
		},
	},
	'action cards - doduo': {
		test(game): void {
			const doduo = game.actionCards.doduo;
			assert(doduo);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(doduo.getAutoPlayTarget(game, []));
			assertStrictEqual(doduo.isPlayableTarget(game, []), true);
		},
	},
	'action cards - machamp': {
		test(game): void {
			const machamp = game.actionCards.machamp;
			assert(machamp);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(machamp.getAutoPlayTarget(game, []));
			assertStrictEqual(machamp.isPlayableTarget(game, []), true);
		},
	},
	'action cards - inkay': {
		test(game): void {
			const inkay = game.actionCards.inkay;
			assert(inkay);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(inkay.getAutoPlayTarget(game, []));
			assertStrictEqual(inkay.isPlayableTarget(game, []), true);
		},
	},
	'action cards - slaking': {
		test(game): void {
			const slaking = game.actionCards.slaking;
			assert(slaking);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(slaking.getAutoPlayTarget(game, []));
			assertStrictEqual(slaking.isPlayableTarget(game, []), true);
		},
	},
	'action cards - spinda': {
		test(game): void {
			const spinda = game.actionCards.spinda;
			assert(spinda);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(spinda.getAutoPlayTarget(game, []));
			assertStrictEqual(spinda.isPlayableTarget(game, []), true);
		},
	},
};

export const game: IGameFile<BulbasaursUno> = Games.copyTemplateProperties(cardGame, {
	aliases: ["bulbasaurs", "uno", "bu"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon]", Config.commandCharacter + "draw"],
	commands: Object.assign(Tools.deepClone(cardGame.commands), commands),
	class: BulbasaursUno,
	description: "Each round, players can play a card that matches the type or color of the top card or draw a new card. " +
		"<a href='http://psgc.weebly.com/pokeuno.html'>Action card descriptions</a>",
	formerNames: ["Pokeuno"],
	name: "Bulbasaur's Uno",
	mascot: "Bulbasaur",
	scriptedOnly: true,
	tests,
});
