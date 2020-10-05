import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { GameCommandDefinitions, GameCommandReturnType, IGameAchievement, IGameFile } from "../types/games";
import type { User } from "../users";
import type { IActionCardData, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

type AchievementNames = "drawwizard" | "luckofthedraw";
type ActionCardsType = Dict<IActionCardData<BulbasaursUno>>;

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
		"kecleon": {
			name: "Kecleon",
			description: "Change color",
			requiredTarget: true,
			getRandomTarget(game, hand) {
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
			getRandomTarget(game, hand) {
				if (hand.length >= 3) {
					for (const cardA of hand) {
						for (const cardB of hand) {
							if (cardA === cardB || cardA.action || cardB.action || !game.isPokemonCard(cardA) ||
								!game.isPokemonCard(cardB)) continue;
							if (game.isCardPair(cardA, cardB) && (game.isCardPair(cardA, game.topCard) ||
								game.isCardPair(cardB, game.topCard))) {
								return this.name + ", " + cardA.name + ", " + cardB.name;
							}
						}
					}
				} else {
					for (const card of hand) {
						if (card.action) continue;
						return this.name + ", " + card.name;
					}
				}
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				if (hand!.length >= 3) {
					if (targets.length < 2) {
						if (player) player.say("Please include the 2 cards you want to pair.");
						return false;
					}
					const idA = Tools.toId(targets[0]);
					const idB = Tools.toId(targets[1]);
					let indexA = -1;
					let indexB = -1;
					for (let i = 0; i < hand!.length; i++) {
						if (hand![i].id === idA) {
							indexA = i;
							continue;
						}
						if (hand![i].id === idB) {
							indexB = i;
							continue;
						}
					}
					if (indexA === -1) {
						if (player) {
							const pokemon = Dex.getPokemon(idA);
							player.say(pokemon ? "You do not have [ " + pokemon.name + " ]." :
								CommandParser.getErrorText(['invalidPokemon', targets[0]]));
						}
						return false;
					}
					if (indexB === -1) {
						if (player) {
							const pokemon = Dex.getPokemon(idB);
							player.say(pokemon ? "You do not have [ " + pokemon.name + " ]." :
								CommandParser.getErrorText(['invalidPokemon', targets[1]]));
						}
						return false;
					}
					const cardA = hand![indexA];
					const cardB = hand![indexB];
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
					if (!targets.length) {
						if (player) player.say("Please include another card.");
						return false;
					}
					const idA = Tools.toId(targets[0]);
					let indexA = -1;
					for (let i = 0; i < hand!.length; i++) {
						if (hand![i].id === idA) {
							indexA = i;
							break;
						}
					}
					if (indexA === -1) {
						if (player) {
							const pokemon = Dex.getPokemon(idA);
							player.say(pokemon ? "You do not have [ " + pokemon.name + " ]." :
								CommandParser.getErrorText(['invalidPokemon', targets[0]]));
						}
						return false;
					}
					const cardA = hand![indexA];
					if (!game.isPokemonCard(cardA) || !game.isPlayableCard(cardA, game.topCard)) {
						if (player) player.say("You must play a card that matches color or a type with the top card.");
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
			getAutoPlayTarget(game, hand) {
				return this.name;
			},
			isPlayableTarget(game, hand) {
				return true;
			},
		},
		"machamp": {
			name: "Machamp",
			description: "Make the next player draw 4",
			drawCards: 4,
			getAutoPlayTarget(game, hand) {
				return this.name;
			},
			isPlayableTarget(game, hand) {
				return true;
			},
		},
		"inkay": {
			name: "Inkay",
			description: "Reverse the turn order",
			getAutoPlayTarget(game, hand) {
				return this.name;
			},
			isPlayableTarget(game, hand) {
				return true;
			},
		},
		"slaking": {
			name: "Slaking",
			description: "Skip the next player's turn",
			skipPlayers: 1,
			getAutoPlayTarget(game, hand) {
				return this.name;
			},
			isPlayableTarget(game, hand) {
				return true;
			},
		},
		"spinda": {
			name: "Spinda",
			description: "Shuffle the player order",
			getAutoPlayTarget(game, hand) {
				return this.name;
			},
			isPlayableTarget(game, hand) {
				return true;
			},
		},
	};
	colorsLimit: number = 20;
	drawAchievement = BulbasaursUno.achievements.drawwizard;
	drawAchievementAmount = drawWizardAmount;
	finitePlayerCards: boolean = true;
	playerCards = new Map<Player, IPokemonCard[]>();
	shinyCardAchievement = BulbasaursUno.achievements.luckofthedraw;
	typesLimit: number = 20;

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
			if (this.topCard.action && this.topCard.action.drawCards) {
				delete this.topCard.action;
			}
			this.nextRound();
		}
	}

	isPlayableCard(card: IPokemonCard, otherCard: IPokemonCard): boolean {
		return this.isCardPair(card, otherCard);
	}

	arePlayableCards(cards: IPokemonCard[]): boolean {
		return true;
	}

	playActionCard(card: IPokemonCard, player: Player, targets: string[], cards: IPokemonCard[]): IPokemonCard[] | boolean {
		if (!card.action) throw new Error("playActionCard called with a regular card");
		if (!card.action.isPlayableTarget(this, targets, cards, player)) return false;

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
		} else if (card.id === 'greninja') {
			const type = Tools.toId(targets[0]);
			this.topCard.types = [types[type]];
			cardDetail = types[type];
		} else if (card.id === 'kecleon') {
			const color = Tools.toId(targets[0]);
			this.topCard.color = this.colors[color];
			cardDetail = this.colors[color];
		} else if (card.id === 'inkay') {
			this.say("**The turn order was reversed!**");
			this.playerOrder.reverse();
			const playerIndex = this.playerOrder.indexOf(player);
			this.playerList = this.playerOrder.slice(playerIndex + 1);
		} else if (card.id === 'spinda') {
			this.say("**The turn order was shuffled!**");
			this.playerOrder = this.shuffle(this.playerOrder);
			let index = this.playerOrder.indexOf(player) + 1;
			if (index === this.playerOrder.length) index = 0;
			this.playerList = this.playerOrder.slice(index);
		} else if (card.id === 'slaking') {
			this.topCard.action = card.action;
		} else if (card.id === 'magnemite') {
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

		this.storePreviouslyPlayedCard({card: card.displayName || card.name, detail: cardDetail, shiny: firstTimeShiny});
		this.currentPlayer = null;

		if (drawCards > 0) {
			if (!player.eliminated) this.drawCard(player, drawCards);
			if (this.topCard.action && this.topCard.action.drawCards) delete this.topCard.action;
		} else {
			if (!player.eliminated && cards.length) this.updatePlayerHtmlPage(player);
		}

		return true;
	}
}

const commands: GameCommandDefinitions<BulbasaursUno> = {
	draw: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canPlay || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
			this.awaitingCurrentPlayerCard = false;
			this.drawCard(this.players[user.id]);
			this.currentPlayer = null; // prevent Draw Wizard from activating on a draw
			this.nextRound();
			return true;
		},
		chatOnly: true,
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
});
