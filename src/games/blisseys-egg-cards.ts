import type { Player } from "../room-activity";
import { assert, assertStrictEqual } from "../test/test-tools";
import type { GameCommandDefinitions, GameFileTests, IGameAchievement, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IActionCardData, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

type AchievementNames = "luckofthedraw";
type ActionCardsType = Dict<IActionCardData<BlisseysEggCards>>;

const bannedEggGroups: string[] = ['Undiscovered'];
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
		"magby": {
			name: "Magby",
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
		"magmar": {
			name: "Magmar",
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
			description: "Play on any egg group",
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
			description: "Breed a card with the top card",
			requiredTarget: true,
			getCard(game) {
				return game.itemToActionCard(this);
			},
			getRandomTarget(game, hand) {
				const cards = game.shuffle(hand);
				for (const card of cards) {
					if (!card.action && this.isPlayableTarget(game, [card.name], hand)) {
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
					if (!game.containsCard(pokemon.name, hand)) {
						if (player) player.say("You do not have [ " + pokemon.name + " ].");
						return false;
					}
				}

				let matchingEggGroup = false;
				for (const i of game.topCard.eggGroups) {
					for (const j of pokemon.eggGroups) {
						if (i === j) {
							matchingEggGroup = true;
							break;
						}
					}
					if (matchingEggGroup) break;
				}

				if (!matchingEggGroup) {
					if (player) player.say("You must play a card that is in an egg group with the top card.");
					return false;
				}

				return true;
			},
		},
	};
	detailLabelWidth: number = 100;
	eggGroupsLimit: number = 20;
	finitePlayerCards: boolean = true;
	maxCardRounds: number = 50;
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
		if (pokemon.eggGroups.length === 1 && bannedEggGroups.includes(pokemon.eggGroups[0])) return true;
		if (pokemon.prevo && Tools.toId(pokemon.prevo) in this.actionCards) return true;
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

	isPlayableCard(card: IPokemonCard, otherCard: IPokemonCard): boolean {
		return this.isCardPair(card, otherCard);
	}

	arePlayableCards(): boolean {
		return true;
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

	playActionCard(card: IPokemonCard, player: Player, targets: string[], cards: IPokemonCard[]): IPokemonCard[] | boolean {
		if (!card.action) throw new Error("playActionCard called with a regular card");
		if (!card.action.isPlayableTarget(this, targets, cards, player)) return false;

		let cardDetail: string | undefined;
		if (card.id === 'fullincense') {
			this.addTopCardEggGroup('Monster');
		} else if (card.id === 'laxincense') {
			this.addTopCardEggGroup('Amorphous');
		} else if (card.id === 'oddincense') {
			this.addTopCardEggGroup('Human-Like');
		} else if (card.id === 'rockincense') {
			this.addTopCardEggGroup('Mineral');
		} else if (card.id === 'roseincense') {
			this.addTopCardEggGroup('Grass');
		} else if (card.id === 'seaincense') {
			this.addTopCardEggGroup('Fairy');
		} else if (card.id === 'waveincense') {
			this.addTopCardEggGroup('Water 1');
		} else if (card.id === 'magby') {
			const eggGroup = Tools.toId(targets[0]);
			this.topCard.eggGroups = [eggGroups[eggGroup]];
			cardDetail = eggGroups[eggGroup];
		} else if (card.id === 'magmar') {
			const eggGroup1 = Tools.toId(targets[0]);
			const eggGroup2 = Tools.toId(targets[1]);
			this.topCard.eggGroups = [eggGroups[eggGroup1], eggGroups[eggGroup2]];
			cardDetail = eggGroups[eggGroup1] + ", " + eggGroups[eggGroup2];
		} else if (card.id === 'ditto') {
			let playableCard: IPokemonCard | null = null;
			while (!playableCard) {
				const possibleCard = this.getCard() as IPokemonCard;
				if (this.isPlayableCard(possibleCard, this.topCard)) {
					playableCard = possibleCard;
				}
			}

			this.setTopCard(playableCard, player);
		} else if (card.id === 'destinyknot') {
			const prevos: IPokemon[] = [];
			const topCard = Dex.getExistingPokemon(this.topCard.name);
			const lowestTopCard = this.getLowestPlayableStage(topCard);
			if (lowestTopCard.name !== this.topCard.name) prevos.push(lowestTopCard);

			const playedCard = Dex.getExistingPokemon(targets[0]);
			const lowestPlayedCard = this.getLowestPlayableStage(playedCard);
			if (lowestPlayedCard.name !== playedCard.name) prevos.push(lowestPlayedCard);

			if (!prevos.length) prevos.push(topCard, playedCard);

			this.setTopCard(this.pokemonToCard(this.sampleOne(prevos)), player);
		}

		this.awaitingCurrentPlayerCard = false;
		if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);

		this.storePreviouslyPlayedCard({card: card.displayName || card.name, detail: cardDetail});
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
	'action cards - magby': {
		test(game): void {
			const magby = game.actionCards.magby;
			assert(magby);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(magby.getAutoPlayTarget(game, []));
			assertStrictEqual(magby.isPlayableTarget(game, ["Monster"]), true);
			assertStrictEqual(magby.isPlayableTarget(game, ["Grass"]), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Rattata"));
			assert(magby.getAutoPlayTarget(game, []));
			assertStrictEqual(magby.isPlayableTarget(game, ["Monster"]), true);
			assertStrictEqual(magby.isPlayableTarget(game, ["Field"]), false);
			assertStrictEqual(magby.isPlayableTarget(game, ["Undiscovered"]), false);
			assertStrictEqual(magby.isPlayableTarget(game, [""]), false);
			assertStrictEqual(magby.isPlayableTarget(game, ["Monster", "Grass"]), false);
		},
	},
	'action cards - magmar': {
		test(game): void {
			const magmar = game.actionCards.magmar;
			assert(magmar);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(magmar.getAutoPlayTarget(game, []));
			assertStrictEqual(magmar.isPlayableTarget(game, ["Field", "Fairy"]), true);
			assertStrictEqual(magmar.isPlayableTarget(game, ["Monster", "Grass"]), false);
			assertStrictEqual(magmar.isPlayableTarget(game, ["Grass", "Monster"]), false);
			assertStrictEqual(magmar.isPlayableTarget(game, ["Field"]), false);
			assertStrictEqual(magmar.isPlayableTarget(game, ["Undiscovered", "Fairy"]), false);
			assertStrictEqual(magmar.isPlayableTarget(game, ["Fairy", "Undiscovered"]), false);
			assertStrictEqual(magmar.isPlayableTarget(game, [""]), false);
		},
	},
	'action cards - destinyknot': {
		test(game): void {
			const destinyknot = game.actionCards.destinyknot;
			assert(destinyknot);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Abomasnow"));
			const hand = [game.pokemonToCard(Dex.getExistingPokemon("Aggron"))];
			assert(destinyknot.getAutoPlayTarget(game, hand));
			assertStrictEqual(destinyknot.isPlayableTarget(game, ["Aggron"], hand), true);
			assertStrictEqual(destinyknot.isPlayableTarget(game, ["Amaura"], hand), false);
			assertStrictEqual(destinyknot.isPlayableTarget(game, [""], hand), false);
		},
	},
};

export const game: IGameFile<BlisseysEggCards> = Games.copyTemplateProperties(cardGame, {
	aliases: ["blisseys", "eggcards", "bec"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon]", Config.commandCharacter + "draw"],
	commands: Object.assign(Tools.deepClone(cardGame.commands), commands),
	class: BlisseysEggCards,
	description: "Each round, players can play a card that matches an egg group of the top card or draw a card.",
	name: "Blissey's Egg Cards",
	mascot: "Blissey",
	scriptedOnly: true,
	tests,
});
