import type { Player } from "../room-activity";
import { assert, assertStrictEqual } from "../test/test-tools";
import type { GameCommandDefinitions, GameFileTests, IGameAchievement, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IActionCardData, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

type AchievementNames = "luckofthedraw";
type ActionCardNames = 'waveincense' | 'seaincense' | 'roseincense' | 'rockincense' | 'oddincense' | 'fullincense' | 'laxincense' |
	'happiny' | 'chansey' | 'ditto' | 'destinyknot';
type ActionCardsType = KeyedDict<ActionCardNames, IActionCardData<BlisseysEggCards>>;

const bannedEggGroups: string[] = ['Ditto', 'Undiscovered', 'Water 3', 'Water 2'];
const eggGroups: Dict<string> = {};
const eggGroupKeys: string[] = [];

class BlisseysEggCards extends CardMatching<ActionCardsType> {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"luckofthedraw": {name: "Luck of the Draw", type: 'shiny', bits: 1000, repeatBits: 250, description:'draw and play a shiny card'},
	};

	actionCards: ActionCardsType = {
		"waveincense": {
			name: "Wave Incense",
			description: "Add Water 1 group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.eggGroups.includes('Water 1')) {
					if (player) {
						player.say(game.topCard.name + " is already in the Water 1 group!");
					}
					return false;
				}

				return true;
			},
		},
		"seaincense": {
			name: "Sea Incense",
			description: "Add Fairy group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.eggGroups.includes('Fairy')) {
					if (player) {
						player.say(game.topCard.name + " is already in the Fairy group!");
					}
					return false;
				}

				return true;
			},
		},
		"roseincense": {
			name: "Rose Incense",
			description: "Add Grass group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.eggGroups.includes('Grass')) {
					if (player) {
						player.say(game.topCard.name + " is already in the Grass group!");
					}
					return false;
				}

				return true;
			},
		},
		"rockincense": {
			name: "Rock Incense",
			description: "Add Mineral group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.eggGroups.includes('Mineral')) {
					if (player) {
						player.say(game.topCard.name + " is already in the Mineral group!");
					}
					return false;
				}

				return true;
			},
		},
		"oddincense": {
			name: "Odd Incense",
			description: "Add Human-Like group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.eggGroups.includes('Human-Like')) {
					if (player) {
						player.say(game.topCard.name + " is already in the Human-Like group!");
					}
					return false;
				}

				return true;
			},
		},
		"laxincense": {
			name: "Lax Incense",
			description: "Add Amorphous group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.eggGroups.includes('Amorphous')) {
					if (player) {
						player.say(game.topCard.name + " is already in the Amorphous group!");
					}
					return false;
				}

				return true;
			},
		},
		"fullincense": {
			name: "Full Incense",
			description: "Add Monster group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.eggGroups.includes('Monster')) {
					if (player) {
						player.say(game.topCard.name + " is already in the Monster group!");
					}
					return false;
				}

				return true;
			},
		},
		"happiny": {
			name: "happiny",
			description: "Change to 1 egg group",
			requiredTarget: true,
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getRandomTarget(game) {
				let targets: string[] = [game.sampleOne(eggGroupKeys)];
				while (!this.isPlayableTarget(game, targets)) {
					targets = [game.sampleOne(eggGroupKeys)];
				}

				return this.name + ", " + targets[0];
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				if (targets.length !== 1) {
					if (player) player.say("You must specify 1 egg group.");
					return false;
				}

				const eggGroup = Tools.toId(targets[0]);
				if (!eggGroup) {
					if (player) player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [egg group]``");
					return false;
				}

				if (!(eggGroup in eggGroups)) {
					if (player) player.say(CommandParser.getErrorText(['invalidEggGroup', targets[0]]));
					return false;
				}

				if (game.topCard.eggGroups.length === 1 && eggGroups[eggGroup] === game.topCard.eggGroups[0]) {
					if (player) player.say("The top card is already in the " + eggGroups[eggGroup] + " egg group.");
					return false;
				}

				return true;
			},
		},
		"chansey": {
			name: "Chansey",
			description: "Change to 2 egg groups",
			requiredTarget: true,
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getRandomTarget(game) {
				let randomEggGroups = game.sampleMany(eggGroupKeys, 2);
				while (!this.isPlayableTarget(game, randomEggGroups)) {
					randomEggGroups = game.sampleMany(eggGroupKeys, 2);
				}

				return this.name + ", " + randomEggGroups.join(", ");
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				if (targets.length !== 2) {
					if (player) player.say("You must specify 2 egg groups.");
					return false;
				}

				const eggGroup1 = Tools.toId(targets[0]);
				const eggGroup2 = Tools.toId(targets[1]);
				if (!eggGroup1 || !eggGroup2) {
					if (player) player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [egg group 1], " +
						"[egg group 2]``");
					return false;
				}

				if (!(eggGroup1 in eggGroups)) {
					if (player) player.say(CommandParser.getErrorText(['invalidEggGroup', targets[0]]));
					return false;
				}

				if (!(eggGroup2 in eggGroups)) {
					if (player) player.say(CommandParser.getErrorText(['invalidEggGroup', targets[1]]));
					return false;
				}

				if (eggGroup1 === eggGroup2) {
					if (player) player.say("Please enter two unique egg groups.");
					return false;
				}

				if (game.topCard.eggGroups.length === 2) {
					const eggGroupsList = [eggGroups[eggGroup1], eggGroups[eggGroup2]];
					if (game.topCard.eggGroups.slice().sort().join(",") === eggGroupsList.sort().join(",")) {
						if (player) player.say("The top card is already in the " + eggGroupsList.join(" and ") + " egg groups.");
						return false;
					}
				}

				return true;
			},
		},
		"ditto": {
			name: "Ditto",
			description: "Play on any top card",
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
		"destinyknot": {
			name: "Destiny Knot",
			description: "Breed 2 of your cards",
			requiredTarget: true,
			getCard(game) {
				return game.itemToActionCard(this);
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
					if (targets.length !== 2) {
						if (player) player.say("You must specify 2 Pokemon.");
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
						if (player) player.say("You cannot breed action cards.");
						return false;
					}

					let matchingEggGroup = false;
					for (const i of pokemonA.eggGroups) {
						for (const j of pokemonB.eggGroups) {
							if (i === j) {
								matchingEggGroup = true;
								break;
							}
						}
						if (matchingEggGroup) break;
					}

					if (!matchingEggGroup) {
						if (player) player.say("You must play 2 cards that share an egg group.");
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
					if (!game.isPokemonCard(card)) {
						if (player) player.say(game.playableCardDescription);
						return false;
					}
				}

				return true;
			},
		},
	};
	actionCardAmount: number = 10;
	detailLabelWidth: number = 100;
	eggGroupsLimit: number = 20;
	finitePlayerCards: boolean = true;
	maxCardRounds: number = 100;
	maximumPlayedCards: number = 2;
	playableCardDescription: string = "You must play 1-2 cards that share an egg group with the top card.";
	playerCards = new Map<Player, IPokemonCard[]>();
	shinyCardAchievement = BlisseysEggCards.achievements.luckofthedraw;

	static loadData(): void {
		for (const i in Dex.data.eggGroups) {
			let bannedEggGroup = false;
			for (const eggGroup of bannedEggGroups) {
				if (Tools.toId(eggGroup) === i) {
					bannedEggGroup = true;
					break;
				}
			}
			if (bannedEggGroup) continue;

			eggGroupKeys.push(i);
			eggGroups[i] = Dex.data.eggGroups[i];
			eggGroups[i + 'group'] = Dex.data.eggGroups[i];
		}
	}

	filterPoolItem(pokemon: IPokemon): boolean {
		if (pokemon.prevo && Tools.toId(pokemon.prevo) in this.actionCards) return false;

		let bannedEggGroup = false;
		for (const eggGroup of pokemon.eggGroups) {
			if (bannedEggGroups.includes(eggGroup)) {
				bannedEggGroup = true;
				break;
			}
		}
		if (bannedEggGroup) return false;

		return true;
	}

	filterForme(forme: IPokemon): boolean {
		const baseSpecies = Dex.getExistingPokemon(forme.baseSpecies);
		if (!Tools.compareArrays(baseSpecies.eggGroups, forme.eggGroups)) return true;
		return false;
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

	getCardChatDetails(card: IPokemonCard): string {
		return this.getEggGroupLabel(card);
	}

	getCardPmDetails(card: IPokemonCard): string {
		return this.getEggGroupLabel(card);
	}

	isCardPair(card: IPokemonCard, otherCard: IPokemonCard): boolean {
		if ((card !== this.topCard && card.action) || (otherCard !== this.topCard && otherCard.action)) {
			return false;
		}
		for (const eggGroup of otherCard.eggGroups) {
			if (card.eggGroups.includes(eggGroup)) return true;
		}
		return false;
	}

	addTopCardEggGroup(eggGroup: string): void {
		const newEggGroups = this.topCard.eggGroups.slice();
		newEggGroups.push(eggGroup);
		this.topCard.eggGroups = newEggGroups;
	}

	getLowestPlayableStage(pokemon: IPokemon): IPokemon {
		let stage = pokemon;
		while (stage.prevo) {
			const prevo = Dex.getExistingPokemon(stage.prevo);
			if (prevo.eggGroups.length === 1 && bannedEggGroups.includes(prevo.eggGroups[0])) break;
			stage = prevo;
		}

		return stage;
	}

	playActionCard(card: IPokemonCard, player: Player, targets: string[], cards: IPokemonCard[]): boolean {
		if (!card.action) throw new Error("playActionCard called with a regular card");
		if (!card.action.isPlayableTarget(this, targets, cards, player)) return false;

		const id = card.id as ActionCardNames;
		let cardDetail: string | undefined;
		if (id === 'fullincense') {
			this.addTopCardEggGroup('Monster');
		} else if (id === 'laxincense') {
			this.addTopCardEggGroup('Amorphous');
		} else if (id === 'oddincense') {
			this.addTopCardEggGroup('Human-Like');
		} else if (id === 'rockincense') {
			this.addTopCardEggGroup('Mineral');
		} else if (id === 'roseincense') {
			this.addTopCardEggGroup('Grass');
		} else if (id === 'seaincense') {
			this.addTopCardEggGroup('Fairy');
		} else if (id === 'waveincense') {
			this.addTopCardEggGroup('Water 1');
		} else if (id === 'happiny') {
			const eggGroup = Tools.toId(targets[0]);
			this.topCard.eggGroups = [eggGroups[eggGroup]];
			cardDetail = eggGroups[eggGroup];
		} else if (id === 'chansey') {
			const eggGroup1 = Tools.toId(targets[0]);
			const eggGroup2 = Tools.toId(targets[1]);
			this.topCard.eggGroups = [eggGroups[eggGroup1], eggGroups[eggGroup2]];
			cardDetail = eggGroups[eggGroup1] + ", " + eggGroups[eggGroup2];
		} else if (id === 'ditto') {
			let playableCard: IPokemonCard | null = null;
			while (!playableCard) {
				const possibleCard = this.getCard() as IPokemonCard;
				if (this.isPlayableCard(possibleCard, this.topCard)) {
					playableCard = possibleCard;
				}
			}

			this.setTopCard(playableCard, player);
		} else if (id === 'destinyknot') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			const prevos: IPokemon[] = [];
			const cardA = Dex.getExistingPokemon(targets[0]);
			cards.splice(this.getCardIndex(cardA.name, cards), 1);
			const lowestCardA = this.getLowestPlayableStage(cardA);
			if (lowestCardA.name !== this.topCard.name) prevos.push(lowestCardA);

			if (targets.length > 1) {
				const cardB = Dex.getExistingPokemon(targets[1]);
				cards.splice(this.getCardIndex(cardB.name, cards), 1);
				const lowestCardB = this.getLowestPlayableStage(cardB);
				if (lowestCardB.name !== this.topCard.name) prevos.push(lowestCardB);

				if (!prevos.length) prevos.push(cardA, cardB);

				cardDetail = cardA.name + ", " + cardB.name;
			} else {
				if (!prevos.length) prevos.push(cardA);

				cardDetail = cardA.name;
			}

			this.setTopCard(this.pokemonToCard(this.sampleOne(prevos)), player);
		}

		this.awaitingCurrentPlayerCard = false;
		if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);

		this.storePreviouslyPlayedCard({card: card.name, player: player.name, detail: cardDetail});
		this.currentPlayer = null;

		if (!player.eliminated) this.updatePlayerHtmlPage(player);

		return true;
	}
}

const commands: GameCommandDefinitions<BlisseysEggCards> = {
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

const tests: GameFileTests<BlisseysEggCards> = {
	'action cards - waveincense': {
		test(game): void {
			const waveincense = game.actionCards.waveincense;
			assert(waveincense);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(waveincense.getAutoPlayTarget(game, []));
			assertStrictEqual(waveincense.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Blastoise"));
			assert(!waveincense.getAutoPlayTarget(game, []));
			assertStrictEqual(waveincense.isPlayableTarget(game, []), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Tympole"));
			assert(!waveincense.getAutoPlayTarget(game, []));
			assertStrictEqual(waveincense.isPlayableTarget(game, []), false);
		},
	},
	'action cards - seaincense': {
		test(game): void {
			const seaincense = game.actionCards.seaincense;
			assert(seaincense);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(seaincense.getAutoPlayTarget(game, []));
			assertStrictEqual(seaincense.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Cherrim"));
			assert(!seaincense.getAutoPlayTarget(game, []));
			assertStrictEqual(seaincense.isPlayableTarget(game, []), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Chansey"));
			assert(!seaincense.getAutoPlayTarget(game, []));
			assertStrictEqual(seaincense.isPlayableTarget(game, []), false);
		},
	},
	'action cards - roseincense': {
		test(game): void {
			const roseincense = game.actionCards.roseincense;
			assert(roseincense);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(roseincense.getAutoPlayTarget(game, []));
			assertStrictEqual(roseincense.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Abomasnow"));
			assert(!roseincense.getAutoPlayTarget(game, []));
			assertStrictEqual(roseincense.isPlayableTarget(game, []), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Amoonguss"));
			assert(!roseincense.getAutoPlayTarget(game, []));
			assertStrictEqual(roseincense.isPlayableTarget(game, []), false);
		},
	},
	'action cards - rockincense': {
		test(game): void {
			const rockincense = game.actionCards.rockincense;
			assert(rockincense);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(rockincense.getAutoPlayTarget(game, []));
			assertStrictEqual(rockincense.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Cufant"));
			assert(!rockincense.getAutoPlayTarget(game, []));
			assertStrictEqual(rockincense.isPlayableTarget(game, []), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Baltoy"));
			assert(!rockincense.getAutoPlayTarget(game, []));
			assertStrictEqual(rockincense.isPlayableTarget(game, []), false);
		},
	},
	'action cards - oddincense': {
		test(game): void {
			const oddincense = game.actionCards.oddincense;
			assert(oddincense);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(oddincense.getAutoPlayTarget(game, []));
			assertStrictEqual(oddincense.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Buneary"));
			assert(!oddincense.getAutoPlayTarget(game, []));
			assertStrictEqual(oddincense.isPlayableTarget(game, []), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Abra"));
			assert(!oddincense.getAutoPlayTarget(game, []));
			assertStrictEqual(oddincense.isPlayableTarget(game, []), false);
		},
	},
	'action cards - laxincense': {
		test(game): void {
			const laxincense = game.actionCards.laxincense;
			assert(laxincense);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(laxincense.getAutoPlayTarget(game, []));
			assertStrictEqual(laxincense.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Dragapult"));
			assert(!laxincense.getAutoPlayTarget(game, []));
			assertStrictEqual(laxincense.isPlayableTarget(game, []), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Drifloon"));
			assert(!laxincense.getAutoPlayTarget(game, []));
			assertStrictEqual(laxincense.isPlayableTarget(game, []), false);
		},
	},
	'action cards - fullincense': {
		test(game): void {
			const fullincense = game.actionCards.fullincense;
			assert(fullincense);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(fullincense.getAutoPlayTarget(game, []));
			assertStrictEqual(fullincense.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(!fullincense.getAutoPlayTarget(game, []));
			assertStrictEqual(fullincense.isPlayableTarget(game, []), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Aron"));
			assert(!fullincense.getAutoPlayTarget(game, []));
			assertStrictEqual(fullincense.isPlayableTarget(game, []), false);
		},
	},
	'action cards - happiny': {
		test(game): void {
			const happiny = game.actionCards.happiny;
			assert(happiny);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(happiny.getAutoPlayTarget(game, []));
			assertStrictEqual(happiny.isPlayableTarget(game, ["Monster"]), true);
			assertStrictEqual(happiny.isPlayableTarget(game, ["Grass"]), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(happiny.getAutoPlayTarget(game, []));
			assertStrictEqual(happiny.isPlayableTarget(game, ["Monster"]), true);
			assertStrictEqual(happiny.isPlayableTarget(game, ["Field"]), false);
			assertStrictEqual(happiny.isPlayableTarget(game, ["Undiscovered"]), false);
			assertStrictEqual(happiny.isPlayableTarget(game, [""]), false);
			assertStrictEqual(happiny.isPlayableTarget(game, ["Monster", "Grass"]), false);
		},
	},
	'action cards - magmar': {
		test(game): void {
			const chansey = game.actionCards.chansey;
			assert(chansey);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(chansey.getAutoPlayTarget(game, []));
			assertStrictEqual(chansey.isPlayableTarget(game, ["Field", "Fairy"]), true);
			assertStrictEqual(chansey.isPlayableTarget(game, ["Monster", "Grass"]), false);
			assertStrictEqual(chansey.isPlayableTarget(game, ["Grass", "Monster"]), false);
			assertStrictEqual(chansey.isPlayableTarget(game, ["Field"]), false);
			assertStrictEqual(chansey.isPlayableTarget(game, ["Undiscovered", "Fairy"]), false);
			assertStrictEqual(chansey.isPlayableTarget(game, ["Fairy", "Undiscovered"]), false);
			assertStrictEqual(chansey.isPlayableTarget(game, [""]), false);
		},
	},
	'action cards - destinyknot': {
		test(game): void {
			const destinyknot = game.actionCards.destinyknot;
			assert(destinyknot);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Blissey"));
			let hand = [game.pokemonToCard(Dex.getExistingPokemon("Abomasnow")), game.pokemonToCard(Dex.getExistingPokemon("Aggron")),
				game.pokemonToCard(Dex.getExistingPokemon("Tangela"))];
			assert(destinyknot.getAutoPlayTarget(game, hand));
			assertStrictEqual(destinyknot.isPlayableTarget(game, ["Abomasnow", "Aggron"], hand), true);
			assertStrictEqual(destinyknot.isPlayableTarget(game, ["Aggron", "Tangela"], hand), false);
			assertStrictEqual(destinyknot.isPlayableTarget(game, ["Abomasnow"], hand), false);
			assertStrictEqual(destinyknot.isPlayableTarget(game, [""], hand), false);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Abomasnow"))];
			assert(destinyknot.getAutoPlayTarget(game, hand));
			assertStrictEqual(destinyknot.isPlayableTarget(game, ["Abomasnow"], hand), true);
			assertStrictEqual(destinyknot.isPlayableTarget(game, ["Aggron"], hand), false);
			assertStrictEqual(destinyknot.isPlayableTarget(game, [""], hand), false);
		},
	},
};

export const game: IGameFile<BlisseysEggCards> = Games.copyTemplateProperties(cardGame, {
	aliases: ["blisseys", "eggcards", "bec"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon]", Config.commandCharacter + "draw"],
	commands: Object.assign(Tools.deepClone(cardGame.commands), commands),
	class: BlisseysEggCards,
	description: "Each round, players can play 1-2 cards that share an egg group with the top card or draw a card.",
	name: "Blissey's Egg Cards",
	mascot: "Blissey",
	scriptedOnly: true,
	tests,
});
