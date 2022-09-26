import type { Player } from "../room-activity";
import { addPlayer, assert, assertStrictEqual } from "../test/test-tools";
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
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.eggGroups.includes('Water 1')) {
					return game.topCard.name + " is already in the Water 1 group!";
				}
			},
		},
		"seaincense": {
			name: "Sea Incense",
			description: "Add Fairy group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.eggGroups.includes('Fairy')) {
					return game.topCard.name + " is already in the Fairy group!";
				}
			},
		},
		"roseincense": {
			name: "Rose Incense",
			description: "Add Grass group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.eggGroups.includes('Grass')) {
					return game.topCard.name + " is already in the Grass group!";
				}
			},
		},
		"rockincense": {
			name: "Rock Incense",
			description: "Add Mineral group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.eggGroups.includes('Mineral')) {
					return game.topCard.name + " is already in the Mineral group!";
				}
			},
		},
		"oddincense": {
			name: "Odd Incense",
			description: "Add Human-Like group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.eggGroups.includes('Human-Like')) {
					return game.topCard.name + " is already in the Human-Like group!";
				}
			},
		},
		"laxincense": {
			name: "Lax Incense",
			description: "Add Amorphous group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.eggGroups.includes('Amorphous')) {
					return game.topCard.name + " is already in the Amorphous group!";
				}
			},
		},
		"fullincense": {
			name: "Full Incense",
			description: "Add Monster group",
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				if (!this.getTargetErrors(game, [], player, cardsSubset)) {
					return this.name;
				}
			},
			getTargetErrors(game) {
				if (game.topCard.eggGroups.includes('Monster')) {
					return game.topCard.name + " is already in the Monster group!";
				}
			},
		},
		"happiny": {
			name: "happiny",
			description: "Change to 1 egg group",
			requiredTarget: true,
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getRandomTarget(game, player, cardsSubset) {
				const shuffledEggGroups = game.shuffle(eggGroupKeys);
				let usableEggGroup: string | undefined;
				for (const eggGroup of shuffledEggGroups) {
					if (!this.getTargetErrors(game, [eggGroup], player, cardsSubset)) {
						usableEggGroup = eggGroup;
						break;
					}
				}

				if (!usableEggGroup) return;
				return this.name + ", " + usableEggGroup;
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				return this.getRandomTarget!(game, player, cardsSubset);
			},
			getTargetErrors(game, targets) {
				if (targets.length !== 1) {
					return "You must specify 1 egg group.";
				}

				const eggGroup = Tools.toId(targets[0]);
				if (!eggGroup) {
					return "Usage: ``" + Config.commandCharacter + "play " + this.name + ", [egg group]``";
				}

				if (!(eggGroup in eggGroups)) {
					return CommandParser.getErrorText(['invalidEggGroup', targets[0]]);
				}

				if (game.topCard.eggGroups.length === 1 && eggGroups[eggGroup] === game.topCard.eggGroups[0]) {
					return "The top card is already in the " + eggGroups[eggGroup] + " egg group.";
				}
			},
		},
		"chansey": {
			name: "Chansey",
			description: "Change to 2 egg groups",
			requiredTarget: true,
			getCard(game) {
				return game.pokemonToActionCard(this);
			},
			getRandomTarget(game, player, cardsSubset) {
				const shuffledEggGroups = game.shuffle(eggGroupKeys);
				let usableEggGroups: string | undefined;
				for (let i = 0; i < shuffledEggGroups.length; i++) {
					const eggGroupA = shuffledEggGroups[i];
					for (let j = 0; j < shuffledEggGroups.length; j++) {
						if (j === i) continue;
						const eggGroupB = shuffledEggGroups[j];
						if (!this.getTargetErrors(game, [eggGroupA, eggGroupB], player, cardsSubset)) {
							usableEggGroups = eggGroupA + ", " + eggGroupB;
							break;
						}
					}

					if (usableEggGroups) break;
				}

				if (!usableEggGroups) return;

				return this.name + ", " + usableEggGroups;
			},
			getAutoPlayTarget(game, player, cardsSubset) {
				return this.getRandomTarget!(game, player, cardsSubset);
			},
			getTargetErrors(game, targets) {
				if (targets.length !== 2) {
					return "You must specify 2 egg groups.";
				}

				const eggGroup1 = Tools.toId(targets[0]);
				const eggGroup2 = Tools.toId(targets[1]);
				if (!eggGroup1 || !eggGroup2) {
					return "Usage: ``" + Config.commandCharacter + "play " + this.name + ", [egg group 1], [egg group 2]``";
				}

				if (!(eggGroup1 in eggGroups)) {
					return CommandParser.getErrorText(['invalidEggGroup', targets[0]]);
				}

				if (!(eggGroup2 in eggGroups)) {
					return CommandParser.getErrorText(['invalidEggGroup', targets[1]]);
				}

				if (eggGroup1 === eggGroup2) {
					return "Please enter two unique egg groups.";
				}

				if (game.topCard.eggGroups.length === 2) {
					const eggGroupsList = [eggGroups[eggGroup1], eggGroups[eggGroup2]];
					if (game.topCard.eggGroups.slice().sort().join(",") === eggGroupsList.sort().join(",")) {
						return "The top card is already in the " + eggGroupsList.join(" and ") + " egg groups.";
					}
				}
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
			getTargetErrors() {
				return "";
			},
		},
		"destinyknot": {
			name: "Destiny Knot",
			description: "Breed 2 of your cards",
			requiredTarget: true,
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getRandomTarget(game, player, cardsSubset) {
				const cards = cardsSubset || game.playerCards.get(player);
				if (!cards) return;

				if (cards.length >= 3) {
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
				} else {
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
					if (targets.length !== 2) {
						return "You must specify 2 Pokemon.";
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
						return "You cannot breed action cards.";
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
						return "You must play 2 cards that share an egg group.";
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
					if (!game.isPokemonCard(card)) {
						return game.playableCardDescription;
					}
				}
			},
		},
	};
	actionCardAmount: number = 10;
	detailLabelWidth: number = 100;
	eggGroupsLimit: number = 20;
	finitePlayerCards: boolean = true;
	maxCardRounds: number = 100;
	maximumPlayedCards: number = 2;
	maxShownPlayableGroupSize: number = 2;
	playableCardDescription: string = "You must play a card that shares an egg group with the top card.";
	playableCardsDescription: string = "Your first played card must share an egg group with the top card.";
	playerCards = new Map<Player, IPokemonCard[]>();
	shinyCardAchievement = BlisseysEggCards.achievements.luckofthedraw;
	usesEggGroups = true;
	usesTypings = false;

	static loadData(): void {
		const eggGroupsData = Dex.getData().eggGroups;
		for (const i in eggGroupsData) {
			let bannedEggGroup = false;
			for (const eggGroup of bannedEggGroups) {
				if (Tools.toId(eggGroup) === i) {
					bannedEggGroup = true;
					break;
				}
			}
			if (bannedEggGroup) continue;

			eggGroupKeys.push(i);
			eggGroups[i] = eggGroupsData[i];
			eggGroups[i + 'group'] = eggGroupsData[i];
		}
	}

	filterPoolItem(dex: typeof Dex, pokemon: IPokemon): boolean {
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

	filterForme(dex: typeof Dex, forme: IPokemon): boolean {
		const baseSpecies = dex.getPokemon(forme.baseSpecies);
		if (baseSpecies && !Tools.compareArrays(baseSpecies.eggGroups, forme.eggGroups)) return true;
		return false;
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

	getCardChatDetails(card: IPokemonCard): string {
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
		if (card.action.getTargetErrors(this, targets, player, cards)) return false;

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
			if (lowestCardA.id !== this.topCard.id) prevos.push(lowestCardA);

			if (targets.length > 1) {
				const cardB = Dex.getExistingPokemon(targets[1]);
				cards.splice(this.getCardIndex(cardB.name, cards), 1);
				const lowestCardB = this.getLowestPlayableStage(cardB);
				if (lowestCardB.id !== this.topCard.id) prevos.push(lowestCardB);

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

		if (!player.eliminated) {
			const htmlPage = this.getHtmlPage(player);
			htmlPage.renderHandHtml();
			htmlPage.renderCardActionsHtml();
			htmlPage.renderPlayedCardsHtml([card]);
			htmlPage.send();
		}

		return true;
	}
}

const commands: GameCommandDefinitions<BlisseysEggCards> = {
	draw: {
		command(target, room, user) {
			if (!this.canPlay || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
			this.awaitingCurrentPlayerCard = false;
			this.currentPlayer = null;
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

const tests: GameFileTests<BlisseysEggCards> = {
	'action cards - waveincense': {
		test(game): void {
			const waveincense = game.actionCards.waveincense;
			assert(waveincense);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(waveincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!waveincense.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Blastoise"));
			assert(!waveincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!waveincense.getTargetErrors(game, [], player), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Tympole"));
			assert(!waveincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!waveincense.getTargetErrors(game, [], player), false);
		},
	},
	'action cards - seaincense': {
		test(game): void {
			const seaincense = game.actionCards.seaincense;
			assert(seaincense);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(seaincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!seaincense.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Cherrim"));
			assert(!seaincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!seaincense.getTargetErrors(game, [], player), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Chansey"));
			assert(!seaincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!seaincense.getTargetErrors(game, [], player), false);
		},
	},
	'action cards - roseincense': {
		test(game): void {
			const roseincense = game.actionCards.roseincense;
			assert(roseincense);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(roseincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!roseincense.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Abomasnow"));
			assert(!roseincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!roseincense.getTargetErrors(game, [], player), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Amoonguss"));
			assert(!roseincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!roseincense.getTargetErrors(game, [], player), false);
		},
	},
	'action cards - rockincense': {
		test(game): void {
			const rockincense = game.actionCards.rockincense;
			assert(rockincense);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(rockincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!rockincense.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Cufant"));
			assert(!rockincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!rockincense.getTargetErrors(game, [], player), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Baltoy"));
			assert(!rockincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!rockincense.getTargetErrors(game, [], player), false);
		},
	},
	'action cards - oddincense': {
		test(game): void {
			const oddincense = game.actionCards.oddincense;
			assert(oddincense);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(oddincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!oddincense.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Buneary"));
			assert(!oddincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!oddincense.getTargetErrors(game, [], player), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Abra"));
			assert(!oddincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!oddincense.getTargetErrors(game, [], player), false);
		},
	},
	'action cards - laxincense': {
		test(game): void {
			const laxincense = game.actionCards.laxincense;
			assert(laxincense);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(laxincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!laxincense.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Dragapult"));
			assert(!laxincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!laxincense.getTargetErrors(game, [], player), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Drifloon"));
			assert(!laxincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!laxincense.getTargetErrors(game, [], player), false);
		},
	},
	'action cards - fullincense': {
		test(game): void {
			const fullincense = game.actionCards.fullincense;
			assert(fullincense);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(fullincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!fullincense.getTargetErrors(game, [], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(!fullincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!fullincense.getTargetErrors(game, [], player), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Aron"));
			assert(!fullincense.getAutoPlayTarget(game, player));
			assertStrictEqual(!fullincense.getTargetErrors(game, [], player), false);
		},
	},
	'action cards - happiny': {
		test(game): void {
			const happiny = game.actionCards.happiny;
			assert(happiny);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(happiny.getAutoPlayTarget(game, player));
			assertStrictEqual(!happiny.getTargetErrors(game, ["Monster"], player), true);
			assertStrictEqual(!happiny.getTargetErrors(game, ["Grass"], player), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(happiny.getAutoPlayTarget(game, player));
			assertStrictEqual(!happiny.getTargetErrors(game, ["Monster"], player), true);
			assertStrictEqual(!happiny.getTargetErrors(game, ["Field"], player), false);
			assertStrictEqual(!happiny.getTargetErrors(game, ["Undiscovered"], player), false);
			assertStrictEqual(!happiny.getTargetErrors(game, [""], player), false);
			assertStrictEqual(!happiny.getTargetErrors(game, ["Monster", "Grass"], player), false);
		},
	},
	'action cards - magmar': {
		test(game): void {
			const chansey = game.actionCards.chansey;
			assert(chansey);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(chansey.getAutoPlayTarget(game, player));
			assertStrictEqual(!chansey.getTargetErrors(game, ["Field", "Fairy"], player), true);
			assertStrictEqual(!chansey.getTargetErrors(game, ["Monster", "Grass"], player), false);
			assertStrictEqual(!chansey.getTargetErrors(game, ["Grass", "Monster"], player), false);
			assertStrictEqual(!chansey.getTargetErrors(game, ["Field"], player), false);
			assertStrictEqual(!chansey.getTargetErrors(game, ["Undiscovered", "Fairy"], player), false);
			assertStrictEqual(!chansey.getTargetErrors(game, ["Fairy", "Undiscovered"], player), false);
			assertStrictEqual(!chansey.getTargetErrors(game, [""], player), false);
		},
	},
	'action cards - destinyknot': {
		test(game): void {
			const destinyknot = game.actionCards.destinyknot;
			assert(destinyknot);

			const player = addPlayer(game, "Player 1");
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Blissey"));
			let hand = [game.pokemonToCard(Dex.getExistingPokemon("Abomasnow")), game.pokemonToCard(Dex.getExistingPokemon("Aggron")),
				game.pokemonToCard(Dex.getExistingPokemon("Tangela"))];
			assert(destinyknot.getAutoPlayTarget(game, player, hand));
			assertStrictEqual(!destinyknot.getTargetErrors(game, ["Abomasnow", "Aggron"], player, hand), true);
			assertStrictEqual(!destinyknot.getTargetErrors(game, ["Aggron", "Tangela"], player, hand), false);
			assertStrictEqual(!destinyknot.getTargetErrors(game, ["Abomasnow"], player, hand), false);
			assertStrictEqual(!destinyknot.getTargetErrors(game, [""], player, hand), false);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Abomasnow"))];
			assert(destinyknot.getAutoPlayTarget(game, player, hand));
			assertStrictEqual(!destinyknot.getTargetErrors(game, ["Abomasnow"], player, hand), true);
			assertStrictEqual(!destinyknot.getTargetErrors(game, ["Aggron"], player, hand), false);
			assertStrictEqual(!destinyknot.getTargetErrors(game, [""], player, hand), false);
		},
	},
};

export const game: IGameFile<BlisseysEggCards> = Games.copyTemplateProperties(cardGame, {
	aliases: ["blisseys", "eggcards", "bec"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon]", Config.commandCharacter + "draw"],
	commands: Object.assign((Tools.deepClone(cardGame.commands) as unknown) as GameCommandDefinitions<BlisseysEggCards>, commands),
	class: BlisseysEggCards,
	description: "Each round, players can play 1-2 cards that share an egg group with the top card or draw a card.",
	name: "Blissey's Egg Cards",
	mascot: "Blissey",
	scriptedOnly: true,
	tests: Object.assign({}, cardGame.tests, tests),
});
