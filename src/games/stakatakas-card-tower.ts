import type { Player } from "../room-activity";
import { addPlayers, assert, assertStrictEqual, runCommand } from "../test/test-tools";
import type { AchievementsDict, GameCommandDefinitions, GameCommandReturnType, GameFileTests, IGameFile } from "../types/games";
import type { CardType, IActionCardData, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

const achievements: AchievementsDict = {
	"luckofthedraw": {name: "Luck of the Draw", type: 'shiny', bits: 1000, repeatBits: 250, description:'draw and play a shiny card'},
};

class StakatakasCardTower extends CardMatching {
	actionCards: Dict<IActionCardData> = {
		"manaphy": {name: "Shuffle 4", description: "Shuffle 4 of everyone's cards"},
		"phione": {name: "Shuffle 2", description: "Shuffle 2 of everyone's cards"},
		"pachirisu": {name: "Get pair", description: "Get a pair from the deck"},
	};
	autoFillHands: boolean = true;
	colorsLimit: number = 20;
	finitePlayerCards: boolean = true;
	inactivePlayerLimit = 2;
	maxCardRounds: number = 50;
	minimumPlayedCards: number = 2;
	shinyCardAchievement = achievements.luckofthedraw;
	showPlayerCards: boolean = true;
	turnTimeBeforeHighlight: number = 25 * 1000;
	turnTimeAfterHighlight: number = 50 * 1000;
	typesLimit: number = 20;

	onRemovePlayer(player: Player): void {
		const index = this.playerOrder.indexOf(player);
		if (index > -1) this.playerOrder.splice(index, 1);
		if (player === this.currentPlayer) {
			if (this.topCard.action && this.topCard.action.name.startsWith('Draw')) {
				this.topCard.action = null;
			}
			this.nextRound();
		}
	}

	isPlayableCard(card: IPokemonCard, otherCard: IPokemonCard): boolean {
		return this.isCardPair(card, otherCard);
	}

	arePlayableCards(cards: IPokemonCard[]): boolean {
		for (let i = 0; i < cards.length - 1; i++) {
			if (!this.isPlayableCard(cards[i], cards[i + 1])) {
				return false;
			}
		}

		return true;
	}

	playRegularCard(card: IPokemonCard, player: Player, targets: string[], cards: IPokemonCard[]): IPokemonCard[] | boolean {
		const playedCards = [card];
		for (let i = 1; i < targets.length; i++) {
			const id = Tools.toId(targets[i]);
			if (!id) return false;
			const index = this.getCardIndex(id, cards);
			if (index < 0) {
				const pokemon = Dex.getPokemon(id);
				if (pokemon) {
					player.say("You do not have [ " + pokemon.name + " ].");
				} else {
					player.say("'" + targets[i] + "' is not a valid Pokemon.");
				}
				return false;
			}
			if (cards[index] === card) {
				player.say("You can't play the same card twice.");
				return false;
			}
			playedCards.push(cards[index]);
		}

		if (playedCards.length < 2) {
			player.say("You must play at least 2 cards.");
			return false;
		}
		if (!this.arePlayableCards(playedCards)) {
			player.say("All played cards must pair one after the other.");
			return false;
		}

		card = playedCards[playedCards.length - 1];
		const names: string[] = [];
		for (const playedCard of playedCards) {
			if (playedCard !== card) names.push(playedCard.name);
			cards.splice(cards.indexOf(playedCard), 1);
		}

		this.awaitingCurrentPlayerCard = false;
		this.storePreviouslyPlayedCard({card: player.name + "'s " + card.name + " ( + " + names.join(" + ") + ")",
			shiny: card.shiny && !card.played});
		this.setTopCard(card, player);

		let drewCards = false;
		if (this.autoFillHands && !player.eliminated) {
			if (cards.length && cards.length < this.minimumPlayedCards) {
				drewCards = true;
				this.drawCard(player, this.minimumPlayedCards - cards.length);
			}
		}
		if (!drewCards && !player.eliminated && cards.length) this.dealHand(player);
		return playedCards;
	}

	playActionCard(card: IPokemonCard, player: Player, targets: string[], cards: IPokemonCard[]): IPokemonCard[] | boolean {
		if (card.action!.name.startsWith('Shuffle ')) {
			const amount = parseInt(card.action!.name.split("Shuffle ")[1]);
			cards.splice(cards.indexOf(card), 1);
			this.say("Everyone shuffled " + amount + " of their card" + (amount > 1 ? "s" : "") + "!");
			if (cards.length < this.minimumPlayedCards) this.drawCard(player, this.minimumPlayedCards - cards.length);

			const playerCardAmounts: Dict<number> = {};
			let cardPool: CardType[] = [];
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const player = this.players[i];
				const cards = this.playerCards.get(player)!;
				let shuffled = 0;
				for (let i = 0; i < amount; i++) {
					if (!cards.length) break;
					const random = this.sampleOne(cards);
					cardPool.push(random);
					cards.splice(cards.indexOf(random), 1);
					shuffled++;
				}
				playerCardAmounts[player.id] = shuffled;
			}
			cardPool = this.shuffle(cardPool);
			for (const i in playerCardAmounts) {
				const cards = this.playerCards.get(this.players[i])!;
				// don't create a new array; messes with other methods
				for (let j = 0; j < playerCardAmounts[i]; j++) {
					cards.push(cardPool[0]);
					cardPool.shift();
				}
				if (this.players[i] !== player) this.dealHand(this.players[i]);
			}
		} else if (card.action!.name === 'Get pair') {
			let pair: IPokemonCard | null = null;
			while (!pair) {
				const possiblePair = this.getCard() as IPokemonCard;
				for (const card of cards) {
					if (this.isPlayableCard(possiblePair, card)) {
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

		this.storePreviouslyPlayedCard({card: card.displayName || card.name});

		if (!player.eliminated && cards.length) this.dealHand(player);

		return true;
	}
}

const commands: GameCommandDefinitions<StakatakasCardTower> = {
	draw: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canPlay || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
			this.drawCard(this.players[user.id]);
			this.currentPlayer = null; // prevent Draw Wizard from activating on a draw
			this.nextRound();
			return true;
		},
		chatOnly: true,
	},
};

const tests: GameFileTests<StakatakasCardTower> = {
	'it should properly detect possible chains': {
		test(game, format): void {
			addPlayers(game, 4);
			game.topCard = Dex.getPokemonCopy("Pikachu");
			game.start();
			const player = game.currentPlayer!;
			const newCards = [Dex.getPokemonCopy("Charmander"), Dex.getPokemonCopy("Bulbasaur"), Dex.getPokemonCopy("Squirtle"),
				Dex.getPokemonCopy("Eevee")];
			game.playerCards.set(player, newCards);
			assert(!game.hasPlayableCard(player));
			// beginning of chain behind
			newCards.push(Dex.getPokemonCopy("Stunfisk"));
			assert(game.hasPlayableCard(player));
			// beginning of chain in front
			newCards.pop();
			newCards.unshift(Dex.getPokemonCopy("Stunfisk"));
			assert(game.hasPlayableCard(player));
		},
	},
	'it should not create new card arrays for actions': {
		config: {
			async: true,
		},
		async test(game, format): Promise<void> {
			addPlayers(game, 4);
			game.topCard = Dex.getPokemonCopy("Pikachu");
			game.start();
			const player = game.currentPlayer!;
			const newCards = [Dex.getPokemonCopy("Charmander"), Dex.getPokemonCopy("Bulbasaur"), Dex.getPokemonCopy("Squirtle")];
			const manaphyAction = Dex.getPokemonCopy("Manaphy") as IPokemonCard;
			manaphyAction.action = game.actionCards.manaphy;
			newCards.push(manaphyAction);
			game.playerCards.set(player, newCards);
			assert(game.hasPlayableCard(player));
			game.canPlay = true;
			await runCommand('play', 'Manaphy', game.room, player.name);
			assert(!game.ended);
			const playerCards = game.playerCards.get(player)!;
			assert(!playerCards.includes(manaphyAction));
			assertStrictEqual(playerCards, newCards);
		},
	},
	'it should properly handle card counts - 1 remaining': {
		config: {
			async: true,
		},
		async test(game, format): Promise<void> {
			addPlayers(game, 4);
			game.topCard = Dex.getPokemonCopy("Pikachu");
			game.start();
			const player = game.currentPlayer!;
			const cards = [Dex.getPokemonCopy("Ampharos"), Dex.getPokemonCopy("Archen"), Dex.getPokemonCopy("Beautifly"),
				Dex.getPokemonCopy("Squirtle")];
			game.playerCards.set(player, cards);
			assert(game.hasPlayableCard(player));
			game.canPlay = true;
			await runCommand('play', 'Ampharos, Archen, Beautifly', game.room, player.name);
			assert(!game.ended);
			assert(game.playerCards.get(player)!.length >= 2);
		},
	},
	'it should properly handle card counts - 0 remaining': {
		config: {
			async: true,
		},
		async test(game, format): Promise<void> {
			addPlayers(game, 4);
			game.topCard = Dex.getPokemonCopy("Pikachu");
			game.start();
			const player = game.currentPlayer!;
			const cards = [Dex.getPokemonCopy("Ampharos"), Dex.getPokemonCopy("Archen"), Dex.getPokemonCopy("Beautifly"),
				Dex.getPokemonCopy("Beedrill")];
			game.playerCards.set(player, cards);
			assert(game.hasPlayableCard(player));
			game.canPlay = true;
			await runCommand('play', 'Ampharos, Archen, Beautifly, Beedrill', game.room, player.name);
			assert(game.ended);
			assertStrictEqual(cards.length, 0);
		},
	},
};

export const game: IGameFile<StakatakasCardTower> = Games.copyTemplateProperties(cardGame, {
	achievements,
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
