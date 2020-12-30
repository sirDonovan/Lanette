import type { Player } from "../room-activity";
import { addPlayers, assert, assertStrictEqual, runCommand } from "../test/test-tools";
import type { GameCommandDefinitions, GameFileTests, IGameAchievement, IGameFile } from "../types/games";
import type { IActionCardData, ICard, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

type AchievementNames = "luckofthedraw";
type ActionCardNames = 'manaphy' | 'phione' | 'pachirisu';
type ActionCardsType = KeyedDict<ActionCardNames, IActionCardData<StakatakasCardTower>>;

class StakatakasCardTower extends CardMatching<ActionCardsType> {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"luckofthedraw": {name: "Luck of the Draw", type: 'shiny', bits: 1000, repeatBits: 250, description:'draw and play a shiny card'},
	};

	actionCards: ActionCardsType = {
		"manaphy": {
			name: "Manaphy",
			description: "Shuffle 4 of everyone's cards",
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
		"phione": {
			name: "Phione",
			description: "Shuffle 2 of everyone's cards",
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
		"pachirisu": {
			name: "Pachirisu",
			description: "Get a pair from the deck",
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
	autoFillHands: boolean = true;
	colorsLimit: number = 20;
	finitePlayerCards: boolean = true;
	playerInactiveRoundLimit = 2;
	maxCardRounds: number = 50;
	maximumPlayedCards: number = Infinity;
	minimumPlayedCards: number = 2;
	shinyCardAchievement = StakatakasCardTower.achievements.luckofthedraw;
	showPlayerCards: boolean = true;
	turnTimeLimit: number = 50 * 1000;
	turnWarningTime: number = 30 * 1000;
	typesLimit: number = 20;
	usesColors: boolean = true;

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
		if (id === 'manaphy' || id === 'phione') {
			let amount: number;
			if (id === 'manaphy') {
				amount = 4;
			} else {
				amount = 2;
			}
			cards.splice(cards.indexOf(card), 1);
			this.say("Everyone shuffled " + amount + " of their card" + (amount > 1 ? "s" : "") + "!");
			if (cards.length < this.minimumPlayedCards) this.drawCard(player, this.minimumPlayedCards - cards.length);

			const playerCardAmounts: Dict<number> = {};
			let cardPool: ICard[] = [];
			for (const playerId in this.players) {
				if (this.players[playerId].eliminated) continue;
				const otherPlayer = this.players[playerId];
				const otherPlayerCards = this.playerCards.get(otherPlayer)!;
				let shuffled = 0;
				for (let i = 0; i < amount; i++) {
					if (!otherPlayerCards.length) break;
					const random = this.sampleOne(otherPlayerCards);
					cardPool.push(random);
					otherPlayerCards.splice(otherPlayerCards.indexOf(random), 1);
					shuffled++;
				}
				playerCardAmounts[otherPlayer.id] = shuffled;
			}
			cardPool = this.shuffle(cardPool);
			for (const i in playerCardAmounts) {
				const otherPlayerCards = this.playerCards.get(this.players[i])!;
				// don't create a new array; messes with other methods
				for (let j = 0; j < playerCardAmounts[i]; j++) {
					otherPlayerCards.push(cardPool[0]);
					cardPool.shift();
				}
				if (this.players[i] !== player) this.updatePlayerHtmlPage(this.players[i]);
			}
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		} else if (id === 'pachirisu') {
			let pair: IPokemonCard | null = null;
			while (!pair) {
				const possiblePair = this.getCard() as IPokemonCard;
				for (const possibleCard of cards) {
					if (this.isPlayableCard(possiblePair, possibleCard)) {
						pair = possiblePair;
						break;
					}
				}
			}

			cards.push(pair);
			player.say(card.name + " found you a " + pair.name + "!");
		}

		this.awaitingCurrentPlayerCard = false;
		if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);

		this.storePreviouslyPlayedCard({card: card.name, player: player.name});
		this.currentPlayer = null;

		if (!player.eliminated) this.updatePlayerHtmlPage(player);

		return true;
	}
}

const commands: GameCommandDefinitions<StakatakasCardTower> = {
	draw: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canPlay || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
			this.currentPlayer = null;
			const drawnCards = this.drawCard(this.players[user.id]);
			this.updatePlayerHtmlPage(this.players[user.id], drawnCards);
			this.nextRound();
			return true;
		},
		chatOnly: true,
	},
};

const tests: GameFileTests<StakatakasCardTower> = {
	'it should only allow cards to be played once per turn': {
		test(game): void {
			addPlayers(game, 4);
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Pikachu"));
			game.start();
			const player = game.currentPlayer!;
			let newCards = [game.pokemonToCard(Dex.getExistingPokemon("Stunfisk")),
				game.pokemonToCard(Dex.getExistingPokemon("Eevee")), game.pokemonToCard(Dex.getExistingPokemon("Pidgey")),
				game.pokemonToCard(Dex.getExistingPokemon("Charmander"))];
			game.playerCards.set(player, newCards);
			assert(game.hasPlayableCard(game.getTurnCards(player)));
			game.canPlay = true;
			player.useCommand('play', 'Stunfisk, Eevee, Pidgey, Eevee, Pidgey');
			assert(!game.ended);
			assertStrictEqual(newCards.length, 4);

			newCards = [game.pokemonToCard(Dex.getExistingPokemon("Stunfisk")),
				game.pokemonToCard(Dex.getExistingPokemon("Eevee")), game.pokemonToCard(Dex.getExistingPokemon("Pidgey")),
				game.pokemonToCard(Dex.getExistingPokemon("Charmander")), game.pokemonToCard(Dex.getExistingPokemon("Eevee"))];
			game.playerCards.set(player, newCards);
			assert(game.hasPlayableCard(game.getTurnCards(player)));
			game.canPlay = true;
			player.useCommand('play', 'Stunfisk, Eevee, Pidgey, Eevee');
			assert(!game.ended);
			assert(newCards.length < 5);
		},
	},
	'it should properly detect possible chains': {
		test(game): void {
			addPlayers(game, 4);
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Pikachu"));
			game.start();
			const player = game.currentPlayer!;
			const newCards = [game.pokemonToCard(Dex.getExistingPokemon("Charmander")),
				game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur")), game.pokemonToCard(Dex.getExistingPokemon("Squirtle")),
				game.pokemonToCard(Dex.getExistingPokemon("Eevee"))];
			game.playerCards.set(player, newCards);
			assert(!game.hasPlayableCard(game.getTurnCards(player)));
			// beginning of chain behind
			newCards.push(game.pokemonToCard(Dex.getExistingPokemon("Stunfisk")));
			assert(game.hasPlayableCard(game.getTurnCards(player)));
			// beginning of chain in front
			newCards.pop();
			newCards.unshift(game.pokemonToCard(Dex.getExistingPokemon("Stunfisk")));
			assert(game.hasPlayableCard(game.getTurnCards(player)));
		},
	},
	'it should not create new card arrays for actions': {
		test(game): void {
			addPlayers(game, 4);
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Pikachu"));
			game.start();
			const player = game.currentPlayer!;
			const newCards = [game.pokemonToCard(Dex.getExistingPokemon("Charmander")),
				game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur")), game.pokemonToCard(Dex.getExistingPokemon("Squirtle"))];
			const manaphyAction = game.pokemonToCard(Dex.getExistingPokemon("Manaphy"));
			// @ts-expect-error
			manaphyAction.action = game.actionCards.manaphy;
			newCards.push(manaphyAction);
			game.playerCards.set(player, newCards);
			assert(game.hasPlayableCard(game.getTurnCards(player)));
			game.canPlay = true;
			runCommand('play', 'Manaphy', game.room, player.name);
			assert(!game.ended);
			const playerCards = game.playerCards.get(player)!;
			assert(!playerCards.includes(manaphyAction));
			assertStrictEqual(playerCards, newCards);
		},
	},
	'it should properly handle card counts - 1 remaining': {
		test(game): void {
			addPlayers(game, 4);
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Pikachu"));
			game.start();
			const player = game.currentPlayer!;
			const cards = [game.pokemonToCard(Dex.getExistingPokemon("Ampharos")),
				game.pokemonToCard(Dex.getExistingPokemon("Archen")), game.pokemonToCard(Dex.getExistingPokemon("Beautifly")),
				game.pokemonToCard(Dex.getExistingPokemon("Squirtle"))];
			game.playerCards.set(player, cards);
			assert(!game.arePlayableCards([game.topCard].concat(cards)));
			assert(game.hasPlayableCard(game.getTurnCards(player)));
			game.canPlay = true;
			runCommand('play', 'Ampharos, Archen, Beautifly', game.room, player.name);
			assert(!game.ended);
			assert(game.playerCards.get(player)!.length >= 2);
		},
	},
	'it should properly handle card counts - 0 remaining': {
		test(game): void {
			addPlayers(game, 4);
			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Pikachu"));
			game.start();
			const player = game.currentPlayer!;
			const cards = [game.pokemonToCard(Dex.getExistingPokemon("Ampharos")),
				game.pokemonToCard(Dex.getExistingPokemon("Archen")), game.pokemonToCard(Dex.getExistingPokemon("Beautifly")),
				game.pokemonToCard(Dex.getExistingPokemon("Beedrill"))];
			game.playerCards.set(player, cards);
			assert(game.arePlayableCards([game.topCard].concat(cards)));
			assert(game.hasPlayableCard(game.getTurnCards(player)));
			game.canPlay = true;
			runCommand('play', 'Ampharos, Archen, Beautifly, Beedrill', game.room, player.name);
			assert(game.ended);
			assertStrictEqual(cards.length, 0);
		},
	},
};

export const game: IGameFile<StakatakasCardTower> = Games.copyTemplateProperties(cardGame, {
	aliases: ["stakatakas", "cardtower", "sct"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon], [Pokemon], [...]", Config.commandCharacter + "draw"],
	commands: Object.assign(Tools.deepClone(cardGame.commands), commands),
	class: StakatakasCardTower,
	customizableOptions: {
		cards: {min: 6, base: 6, max: 8},
	},
	defaultOptions: [],
	description: "Try to play all your cards to win! Stack as many cards as you can with each other by either color or type, starting " +
		"with the top card.",
	name: "Stakataka's Card Tower",
	mascot: "Stakataka",
	scriptedOnly: true,
	tests: Object.assign({}, cardGame.tests, tests),
});
