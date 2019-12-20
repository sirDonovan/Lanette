import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { addPlayers, assert, assertStrictEqual, runCommand } from "../test/test-tools";
import { GameFileTests, IGameFile } from "../types/games";
import { CardType, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

class StakatakasCardTower extends CardMatching {
	actionCardLabels: Dict<string> = {'manaphy': "Shuffle 4 of everyone's cards", 'phione': "Shuffle 2 of everyone's cards", 'pachirisu': 'Get a pair from the deck'};
	actionCards: Dict<string> = {'manaphy': 'Shuffle 4', 'phione': 'Shuffle 2', 'pachirisu': 'Get pair'};
	autoFillHands: boolean = true;
	colorsLimit: number = 20;
	finitePlayerCards: boolean = true;
	maxCardRounds: number = 50;
	minimumPlayedCards: number = 2;
	roundTime: number = 50 * 1000;
	showPlayerCards: boolean = true;
	typesLimit: number = 20;

	onRemovePlayer(player: Player) {
		const index = this.playerOrder.indexOf(player);
		if (index > -1) this.playerOrder.splice(index, 1);
		if (player === this.currentPlayer) {
			if (this.topCard.action && this.topCard.action.startsWith('Draw')) {
				this.topCard.action = '';
				this.showTopCard();
			}
			this.nextRound();
		}
	}

	isPlayableCard(cardA: IPokemonCard, cardB: IPokemonCard) {
		return this.isCardPair(cardA, cardB);
	}

	arePlayableCards(cards: IPokemonCard[]) {
		for (let i = 0; i < cards.length - 1; i++) {
			if (!this.isPlayableCard(cards[i], cards[i + 1])) {
				return false;
			}
		}

		return true;
	}

	playCard(card: IPokemonCard, player: Player, targets: string[], cards: IPokemonCard[]): IPokemonCard[] | boolean {
		const playedCards = [card];
		for (let i = 1; i < targets.length; i++) {
			const id = Tools.toId(targets[i]);
			if (!id) return false;
			const index = this.getCardIndex(id, cards);
			if (index < 0) {
				if (Dex.data.pokedex[id]) {
					player.say("You do not have [ " + Dex.getExistingPokemon(id).species + " ].");
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
		for (let i = 0; i < playedCards.length; i++) {
			cards.splice(cards.indexOf(playedCards[i]), 1);
		}
		this.topCard = card;
		this.showTopCard(card.shiny && !card.played);
		// if (card.shiny && !card.played) Games.unlockAchievement(this.room, player, 'luck of the draw', this);
		card.played = true;
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
		const showTopCard = true;
		if (card.action!.startsWith('Shuffle ')) {
			const amount = parseInt(card.action!.split("Shuffle ")[1]);
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
		} else if (card.action === 'Get pair') {
			let pair: IPokemonCard | null = null;
			while (!pair) {
				const card = this.getCard() as IPokemonCard;
				for (let i = 0; i < cards.length; i++) {
					if (this.isPlayableCard(card, cards[i])) {
						pair = card;
						break;
					}
				}
			}

			cards.push(pair);
			player.say(card.species + " found you a " + pair.species + "!");
		}

		if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);

		if (showTopCard) {
			this.showTopCard();
		}

		if (!player.eliminated && cards.length) this.dealHand(player);

		return true;
	}
}

const commands: Dict<ICommandDefinition<StakatakasCardTower>> = {
	draw: {
		command(target, room, user) {
			if (!(user.id in this.players) || this.players[user.id].eliminated || this.players[user.id].frozen || this.currentPlayer !== this.players[user.id]) return false;
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
		test(game, format) {
			addPlayers(game, 4);
			game.topCard = Dex.getPokemonCopy("Pikachu");
			game.start();
			const player = game.currentPlayer!;
			const newCards = [Dex.getPokemonCopy("Charmander"), Dex.getPokemonCopy("Bulbasaur"), Dex.getPokemonCopy("Squirtle"), Dex.getPokemonCopy("Eevee")];
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
		test(game, format) {
			addPlayers(game, 4);
			game.topCard = Dex.getPokemonCopy("Pikachu");
			game.start();
			const player = game.currentPlayer!;
			const newCards = [Dex.getPokemonCopy("Charmander"), Dex.getPokemonCopy("Bulbasaur"), Dex.getPokemonCopy("Squirtle")];
			const manaphyAction = Dex.getPokemonCopy("Manaphy") as IPokemonCard;
			manaphyAction.action = 'Shuffle 4';
			newCards.push(manaphyAction);
			game.playerCards.set(player, newCards);
			assert(game.hasPlayableCard(player));
			runCommand('play', 'Manaphy', game.room, player.name);
			assert(!game.ended);
			assertStrictEqual(game.playerCards.get(player), newCards);
		},
	},
	'it should properly handle card counts - 1 remaining': {
		test(game, format) {
			addPlayers(game, 4);
			game.topCard = Dex.getPokemonCopy("Pikachu");
			game.start();
			const player = game.currentPlayer!;
			const cards = [Dex.getPokemonCopy("Ampharos"), Dex.getPokemonCopy("Archen"), Dex.getPokemonCopy("Beautifly"), Dex.getPokemonCopy("Squirtle")];
			game.playerCards.set(player, cards);
			assert(game.hasPlayableCard(player));
			runCommand('play', 'Ampharos, Archen, Beautifly', game.room, player.name);
			assert(!game.ended);
			assertStrictEqual(cards.length, 2);
		},
	},
	'it should properly handle card counts - 0 remaining': {
		test(game, format) {
			addPlayers(game, 4);
			game.topCard = Dex.getPokemonCopy("Pikachu");
			game.start();
			const player = game.currentPlayer!;
			const cards = [Dex.getPokemonCopy("Ampharos"), Dex.getPokemonCopy("Archen"), Dex.getPokemonCopy("Beautifly"), Dex.getPokemonCopy("Beedrill")];
			game.playerCards.set(player, cards);
			assert(game.hasPlayableCard(player));
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
	description: "Try to play all your cards to win! Stack as many cards as you can with each other by either color or type, starting with the top card.",
	name: "Stakataka's Card Tower",
	mascot: "Stakataka",
	scriptedOnly: true,
});
