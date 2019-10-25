import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { IPokemonCard } from "./templates/card";
import { CardMatching, commands as templateCommands } from "./templates/card-matching";

const name = "Bulbasaur's Uno";
const types: Dict<string> = {};
let loadedData = false;

class BulbasaursUno extends CardMatching {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");
		const typeKeys = Object.keys(Dex.data.typeChart);
		for (let i = 0; i < typeKeys.length; i++) {
			const type = Tools.toId(typeKeys[i]);
			types[type] = typeKeys[i];
			types[type + 'type'] = typeKeys[i];
		}
		loadedData = true;
	}

	actionCardLabels: Dict<string> = {'greninja': 'Change to 1 type', 'kecleon': 'Change the color', 'doduo': 'Make the next player draw 2', 'machamp': 'Make the next player draw 4',
		'inkay': 'Reverse the turn order', 'slaking': 'Skip the next player\'s turn', 'magnemite': 'Pair and play 2 Pokemon', 'spinda': 'Shuffle the player order'};
	actionCards: Dict<string> = {'greninja': 'Wild (type)', 'kecleon': 'Wild (color)', 'doduo': 'Draw 2', 'machamp': 'Draw 4', 'inkay': 'Reverse',
		'slaking': 'Skip', 'magnemite': 'Pair 2', 'spinda': 'Shuffle'};
	colorsLimit: number = 20;
	finitePlayerCards: boolean = true;
	playerCards = new Map<Player, IPokemonCard[]>();
	typesLimit: number = 20;

// TODO: better workaround?
	arePlayableCards(cards: IPokemonCard[]): boolean {
		return true;
	}

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

	getPlayableCards(player: Player): string[] {
		const cards = this.playerCards.get(player)!;
		const playableCards: string[] = [];
		for (let i = 0; i < cards.length; i++) {
			const card = cards[i];
			if (card.action && card.action === 'Pair 2') {
				const outer = cards.slice();
				outer.splice(i, 1);
				for (let i = 0; i < outer.length; i++) {
					const outerCard = outer[i];
					if (!this.isPlayableCard(outerCard, this.topCard)) continue;
					const inner = outer.slice();
					inner.splice(i, 1);
					for (let i = 0; i < inner.length; i++) {
						if (this.isPlayableCard(inner[i], outerCard)) {
							const action = card.name + ', ' + [inner[i].species, outerCard.species].sort().join(', ');
							if (!playableCards.includes(action)) playableCards.push(action);
						}
					}
				}
			} else {
				if (card.action || this.isPlayableCard(card, this.topCard)) {
					playableCards.push(card.name);
					break;
				}
			}
		}
		return playableCards;
	}

	playActionCard(card: IPokemonCard, player: Player, targets: string[], cards: IPokemonCard[]): IPokemonCard[] | boolean {
		if (!card.action) throw new Error("playActionCard called with a regular card");
		let showTopCard = true;
		let drawCards = 0;
		if (this.topCard.action && this.topCard.action.startsWith('Draw ')) drawCards = parseInt(this.topCard.action.split('Draw ')[1].trim());
		if (card.action.startsWith('Draw ')) {
			const newNumber = drawCards + parseInt(card.action.split('Draw ')[1].trim());
			this.topCard.action = 'Draw ' + newNumber;
			this.say("The top card is now **Draw " + newNumber + "**!");
			showTopCard = false;
			drawCards = 0;
		} else if (card.action === 'Wild (type)') {
			if (!targets[1]) {
				this.say("Please include your choice of type (``" + Config.commandCharacter + "play " + card.species + ", __type__``).");
				return false;
			}
			const type = Tools.toId(targets[1]);
			if (!(type in types)) {
				this.say("Please input a valid type.");
				return false;
			}
			this.topCard.types = [types[type]];
		} else if (card.action === 'Wild (color)') {
			if (!targets[1]) {
				this.say("Please include your choice of color (``" + Config.commandCharacter + "play " + card.species + ", __color__``).");
				return false;
			}
			const color = Tools.toId(targets[1]);
			if (!(color in this.colors)) {
				this.say("Please input a valid color.");
				return false;
			}
			this.topCard.color = this.colors[color];
		} else if (card.action === 'Reverse') {
			this.say("**The turn order was reversed!**");
			this.playerOrder.reverse();
			const playerIndex = this.playerOrder.indexOf(player);
			this.playerList = this.playerOrder.slice(playerIndex + 1);
			showTopCard = false;
		} else if (card.action === 'Shuffle') {
			this.say("**The turn order was shuffled!**");
			this.playerOrder = this.shuffle(this.playerOrder);
			let index = this.playerOrder.indexOf(player) + 1;
			if (index === this.playerOrder.length) index = 0;
			this.playerList = this.playerOrder.slice(index);
			showTopCard = false;
		} else if (card.action === 'Skip') {
			this.topCard.action = 'Skip';
			showTopCard = false;
		} else if (card.action === 'Pair 2') {
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
					player.say(idA in Dex.data.pokedex ? "You do not have [ " + Dex.getExistingPokemon(idA).species + " ]." : "'" + targets[1] + "' is not a valid Pokemon.");
					return false;
				}
				if (indexB === -1) {
					player.say(idB in Dex.data.pokedex ? "You do not have [ " + Dex.getExistingPokemon(idB).species + " ]." : "'" + targets[2] + "' is not a valid Pokemon.");
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
				this.topCard = this.sampleOne(newTopCards);
				// if (this.topCard.shiny) Games.unlockAchievement(this.room, player, 'luck of the draw', this);
				cards.splice(indexA, 1);
				indexB = cards.indexOf(cardB);
				cards.splice(indexB, 1);
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
					player.say(idA in Dex.data.pokedex ? "You do not have [ " + Dex.getExistingPokemon(idA).species + " ]." : "'" + targets[1] + "' is not a valid Pokemon.");
					return false;
				}
				const cardA = cards[indexA];
				if (!this.isPlayableCard(cardA, this.topCard)) {
					this.say("You must play a card that matches color or a type with the top card.");
					return false;
				}
				// if (cardA.shiny) Games.unlockAchievement(this.room, player, 'luck of the draw', this);
				this.topCard = cardA;
				cards.splice(indexA, 1);
			}
		}

		if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);

		if (showTopCard) {
			this.showTopCard();
		}
		if (drawCards > 0) {
			if (!player.eliminated) this.drawCard(player, drawCards);
			if (this.topCard.action && this.topCard.action.startsWith('Draw ')) this.topCard.action = '';
		} else {
			if (!player.eliminated && cards.length) this.dealHand(player);
		}

		return true;
	}
}

const commands: Dict<ICommandDefinition<BulbasaursUno>> = {
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

export const game: IGameFile<BulbasaursUno> = {
	aliases: ["bulbasaurs", "uno", "bu"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon]", Config.commandCharacter + "draw"],
	commands: Object.assign({}, templateCommands, commands),
	class: BulbasaursUno,
	description: "Each round, players can play a card that matches the type or color of the top card or draw a new card. <a href='http://psgc.weebly.com/pokeuno.html'>Action card descriptions</a>",
	formerNames: ["Pokeuno"],
	name,
	mascot: "Bulbasaur",
	scriptedOnly: true,
};
