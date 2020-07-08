import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { AchievementsDict, GameCommandDefinitions, GameCommandReturnType, IGameFile } from "../types/games";
import type { User } from "../users";
import type { IActionCardData, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

const types: Dict<string> = {};

const drawWizardAmount = 6;
const achievements: AchievementsDict = {
	"drawwizard": {name: "Draw Wizard", type: 'special', bits: 1000, description: 'play a card that forces the next ' +
		drawWizardAmount + ' or more players to draw a card'},
	"luckofthedraw": {name: "Luck of the Draw", type: 'shiny', bits: 1000, repeatBits: 250, description:'draw and play a shiny card'},
};

class BulbasaursUno extends CardMatching {
	actionCards: Dict<IActionCardData> = {
		"greninja": {name: "Wild (type)", description: "Change to 1 type", requiredTarget: true},
		"kecleon": {name: "Wild (color)", description: "Change the color", requiredTarget: true},
		"doduo": {name: "Draw 2", description: "Make the next player draw 2"},
		"machamp": {name: "Draw 4", description: "Make the next player draw 4"},
		"inkay": {name: "Reverse", description: "Reverse the turn order"},
		"slaking": {name: "Skip", description: "Skip the next player's turn"},
		"magnemite": {name: "Pair 2", description: "Pair and play 2 Pokemon", requiredOtherCards: 2, requiredTarget: true},
		"spinda": {name: "Shuffle", description: "Shuffle the player order"},
	};
	colorsLimit: number = 20;
	drawAchievement = achievements.drawwizard;
	drawAchievementAmount = drawWizardAmount;
	finitePlayerCards: boolean = true;
	playerCards = new Map<Player, IPokemonCard[]>();
	shinyCardAchievement = achievements.luckofthedraw;
	typesLimit: number = 20;

	static loadData(room: Room | User): void {
		for (const key of Dex.data.typeKeys) {
			const type = Dex.getExistingType(key);
			types[type.id] = type.name;
			types[type.id + 'type'] = type.name;
		}
	}

// TODO: better workaround?
	arePlayableCards(cards: IPokemonCard[]): boolean {
		return true;
	}

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

	getPlayableCards(player: Player): string[] {
		const cards = this.playerCards.get(player)!;
		const playableCards: string[] = [];
		for (let i = 0; i < cards.length; i++) {
			const card = cards[i];
			if (card.action && card.action.name === 'Pair 2') {
				const outer = cards.slice();
				outer.splice(i, 1);
				for (let i = 0; i < outer.length; i++) {
					const outerCard = outer[i];
					if (!this.isPlayableCard(outerCard, this.topCard)) continue;
					const inner = outer.slice();
					inner.splice(i, 1);
					for (const card of inner) {
						if (this.isPlayableCard(card, outerCard)) {
							const action = card.name + ', ' + [card.name, outerCard.name].sort().join(', ');
							if (!playableCards.includes(action)) playableCards.push(action);
						}
					}
				}
			} else {
				if (card.action || this.isPlayableCard(card, this.topCard)) {
					playableCards.push(card.name);
				}
			}
		}
		return playableCards;
	}

	playActionCard(card: IPokemonCard, player: Player, targets: string[], cards: IPokemonCard[]): IPokemonCard[] | boolean {
		if (!card.action) throw new Error("playActionCard called with a regular card");
		let firstTimeShiny = false;
		let cardDetail: string | undefined;
		let drawCards = 0;
		if (this.topCard.action && this.topCard.action.name.startsWith('Draw ')) {
			drawCards = parseInt(this.topCard.action.name.split('Draw ')[1].trim());
		}
		if (card.action.name.startsWith('Draw ')) {
			const newNumber = drawCards + parseInt(card.action.name.split('Draw ')[1].trim());
			const newAction = Tools.deepClone(card.action);
			newAction.name = 'Draw ' + newNumber;
			this.topCard.action = newAction;
			this.say("The top card is now **Draw " + newNumber + "**!");
			drawCards = 0;
		} else if (card.action.name === 'Wild (type)') {
			if (!targets[1]) {
				this.say("Please include your choice of type (``" + Config.commandCharacter + "play " + card.name + ", __type__``).");
				return false;
			}
			const type = Tools.toId(targets[1]);
			if (!(type in types)) {
				this.say("Please input a valid type.");
				return false;
			}
			this.topCard.types = [types[type]];
			cardDetail = types[type];
		} else if (card.action.name === 'Wild (color)') {
			if (!targets[1]) {
				this.say("Please include your choice of color (``" + Config.commandCharacter + "play " + card.name + ", __color__``).");
				return false;
			}
			const color = Tools.toId(targets[1]);
			if (!(color in this.colors)) {
				this.say("Please input a valid color.");
				return false;
			}
			this.topCard.color = this.colors[color];
			cardDetail = this.colors[color];
		} else if (card.action.name === 'Reverse') {
			this.say("**The turn order was reversed!**");
			this.playerOrder.reverse();
			const playerIndex = this.playerOrder.indexOf(player);
			this.playerList = this.playerOrder.slice(playerIndex + 1);
		} else if (card.action.name === 'Shuffle') {
			this.say("**The turn order was shuffled!**");
			this.playerOrder = this.shuffle(this.playerOrder);
			let index = this.playerOrder.indexOf(player) + 1;
			if (index === this.playerOrder.length) index = 0;
			this.playerList = this.playerOrder.slice(index);
		} else if (card.action.name === 'Skip') {
			this.topCard.action = card.action;
		} else if (card.action.name === 'Pair 2') {
			if (cards.length >= 3) {
				if (targets.length < 3) {
					this.say("Please include the 2 cards you want to pair.");
					return false;
				}
				const idA = Tools.toId(targets[1]);
				const idB = Tools.toId(targets[2]);
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
				if (indexA === -1) {
					const pokemon = Dex.getPokemon(idA);
					player.say(pokemon ? "You do not have [ " + pokemon.name + " ]." : CommandParser.getErrorText(['invalidPokemon',
						targets[1]]));
					return false;
				}
				if (indexB === -1) {
					const pokemon = Dex.getPokemon(idB);
					player.say(pokemon ? "You do not have [ " + pokemon.name + " ]." : CommandParser.getErrorText(['invalidPokemon',
						targets[2]]));
					return false;
				}
				const cardA = cards[indexA];
				const cardB = cards[indexB];
				if (cardA.action || cardB.action) {
					this.say("You cannot pair action cards.");
					return false;
				}
				if (!this.isPlayableCard(cardA, cardB)) {
					this.say("Please input a valid pair (matching color or type).");
					return false;
				}
				const newTopCards = [];
				if (this.isPlayableCard(cardA, this.topCard)) newTopCards.push(cardA);
				if (this.isPlayableCard(cardB, this.topCard)) newTopCards.push(cardA);
				if (!newTopCards.length) {
					this.say("You must play a card that matches color or a type with the top card.");
					return false;
				}

				const newTopCard = this.sampleOne(newTopCards);
				if (newTopCard.shiny && !newTopCard.played) firstTimeShiny = true;
				this.setTopCard(newTopCard, player);

				cards.splice(indexA, 1);
				indexB = cards.indexOf(cardB);
				cards.splice(indexB, 1);
				cardDetail = cardA.name + ", " + cardB.name;
			} else {
				if (targets.length < 2) {
					this.say("Please include another card.");
					return false;
				}
				const idA = Tools.toId(targets[1]);
				let indexA = -1;
				for (let i = 0; i < cards.length; i++) {
					if (cards[i].id === idA) {
						indexA = i;
						break;
					}
				}
				if (indexA === -1) {
					const pokemon = Dex.getPokemon(idA);
					player.say(pokemon ? "You do not have [ " + pokemon.name + " ]." : CommandParser.getErrorText(['invalidPokemon',
						targets[1]]));
					return false;
				}
				const cardA = cards[indexA];
				if (!this.isPlayableCard(cardA, this.topCard)) {
					this.say("You must play a card that matches color or a type with the top card.");
					return false;
				}
				if (cardA.shiny && !cardA.played) firstTimeShiny = true;
				this.setTopCard(cardA, player);
				cards.splice(indexA, 1);
				cardDetail = cardA.name;
			}
		}

		this.awaitingCurrentPlayerCard = false;
		if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);

		this.storePreviouslyPlayedCard({card: card.displayName || card.name, detail: cardDetail, shiny: firstTimeShiny});

		if (drawCards > 0) {
			if (!player.eliminated) this.drawCard(player, drawCards);
			if (this.topCard.action && this.topCard.action.name.startsWith('Draw ')) this.topCard.action = null;
		} else {
			if (!player.eliminated && cards.length) this.dealHand(player);
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
	achievements,
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
