import { Player } from "../room-activity";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { IPokemon } from "../types/in-game-data-types";
import { CardType, IMoveCard, IPokemonCard } from "./templates/card";
import { CardMatching, commands as templateCommands} from "./templates/card-matching";

const name = "Axew's Battle Cards";
const types: Dict<string> = {};
let loadedData = false;

class AxewsBattleCards extends CardMatching {
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

	actionCardLabels: Dict<string> = {'soak': 'Make pure Water type', 'trickortreat': 'Add Ghost type', "forestscurse": "Add Grass type", "explosion": "Skip your turn", 'batonpass': 'Replace top card & draw 2',
		'allyswitch': 'Swap with top card & draw 1', 'conversion': 'Change to 1 type', 'conversion2': 'Change to 2 types', 'transform': 'Change the top card', 'recycle': 'Draw 1 card',
		'teeterdance': 'Shuffle the turn order', 'topsyturvy': 'Reverse the turn order'};
	actionCards: Dict<string> = {'soak': 'Soak', 'trickortreat': 'Trick-or-Treat', "forestscurse": "Forest's Curse", "explosion": "Explosion", 'batonpass': 'Baton Pass',
		'allyswitch': 'Ally Switch', 'conversion': 'Conversion', 'conversion2': 'Conversion2', 'transform': 'Transform', 'recycle': 'Recycle',
		'teeterdance': 'Teeter Dance', 'topsyturvy': 'Topsy-Turvy'};
	finitePlayerCards = false;
	maxPlayers = 20;
	playableCardDescription = "You must play a card that is super-effective against the top card";
	roundDrawAmount: number = 1;
	showPlayerCards = false;
	usesColors = false;

// TODO: better workaround?
	arePlayableCards(cards: IPokemonCard[]): boolean {
		return true;
	}

	onRemovePlayer(player: Player) {
		const index = this.playerOrder.indexOf(player);
		if (index > -1) this.playerOrder.splice(index, 1);
		if (player === this.currentPlayer) {
			this.nextRound();
		}
	}

	filterPoolItem(pokemon: IPokemon) {
		if (this.hasNoWeaknesses(pokemon)) return true;
		return false;
	}

	createDeck() {
		const weaknessCounts: Dict<number> = {};
		if (!this.deckPool.length) this.createDeckPool();
		const pokedex = this.shuffle(this.deckPool);
		const deck: CardType[] = [];
		const minimumDeck = ((this.maxPlayers + 1) * this.options.cards);
		for (let i = 0; i < pokedex.length; i++) {
			const pokemon = pokedex[i];
			const weaknesses = Dex.getWeaknesses(pokemon).join(",");
			if (weaknesses in weaknessCounts && weaknessCounts[weaknesses] >= this.options.cards) continue;
			if (!(weaknesses in weaknessCounts)) weaknessCounts[weaknesses] = 0;
			weaknessCounts[weaknesses]++;

			if (this.rollForShinyPokemon()) pokemon.shiny = true;
			deck.push(pokemon);
		}
		if (deck.length < minimumDeck) {
			this.createDeck();
			return;
		}
		const actionCardKeysLength = Object.keys(this.actionCards).length;
		if (actionCardKeysLength) {
			let actionCardAmount = this.actionCardAmount;
			let totalActionCards = actionCardKeysLength * actionCardAmount;
			let maxPercentage = 0.15;
			const lowestPercentage = actionCardKeysLength / (deck.length + totalActionCards);
			if (maxPercentage < lowestPercentage) maxPercentage = lowestPercentage;
			while (actionCardAmount && totalActionCards / (deck.length + totalActionCards) > maxPercentage) {
				actionCardAmount--;
				totalActionCards = actionCardKeysLength * actionCardAmount;
			}
			if (!actionCardAmount) {
				this.createDeck();
				return;
			}
			this.actionCardAmount = actionCardAmount;
			for (const i in this.actionCards) {
				const move = this.actionCards[i];
				for (let i = 0; i < actionCardAmount; i++) {
					const card = Dex.getMoveCopy(move) as IMoveCard;
					card.action = card.name;
					deck.push(card);
				}
			}
		}

		this.deck = this.shuffle(deck);
	}

	getTopCardText() {
		return "**" + this.topCard.species + "** (" + this.topCard.types.join("/") + ")";
	}

	getCardChatDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card);
	}

	getCardPmDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card);
	}

	hasNoWeaknesses(pokemon: IPokemon) {
		let noWeaknesses = true;
		for (const i in Dex.data.typeChart) {
			if (!Dex.isImmune(i, pokemon) && Dex.getEffectiveness(i, pokemon) > 0) {
				noWeaknesses = false;
				break;
			}
		}
		return noWeaknesses;
	}

	isStaleTopCard() {
		return this.hasNoWeaknesses(this.topCard);
	}

	isPlayableCard(cardA: IPokemonCard, cardB?: IPokemonCard) {
		if (!cardA || cardA === this.topCard) return false;
		if (!cardB) cardB = this.topCard;
		let valid = false;
		for (let i = 0; i < cardA.types.length; i++) {
			if (Dex.isImmune(cardA.types[i], cardB)) {
				continue;
			} else {
				const effectiveness = Dex.getEffectiveness(cardA.types[i], cardB);
				if (effectiveness > 0) {
					valid = true;
					break;
				}
			}
		}
		return valid;
	}

	getPlayableCards(player: Player): string[] {
		const cards = this.playerCards.get(player)!;
		const pokemon: string[] = [];
		const playableCards: string[] = [];
		const actionCards: string[] = [];
		for (let i = 0; i < cards.length; i++) {
			let card = cards[i];
			if (card.action) {
				card = card as IMoveCard;
				if (card.id === 'soak') {
					if (this.topCard.types[0] !== 'Water' || this.topCard.types.length > 1) {
						playableCards.push(card.name);
					}
				} else if (card.id === 'trickortreat') {
					if (!this.topCard.types.includes('Ghost')) {
						playableCards.push(card.name);
					}
				} else if (card.id === 'forestscurse') {
					if (!this.topCard.types.includes('Grass')) {
						playableCards.push(card.name);
					}
				} else {
					if (card.id === 'batonpass' || card.id === 'allyswitch') {
						actionCards.push(card.name);
					} else if (card.id === 'conversion') {
						let type = this.sampleOne(Object.keys(Dex.data.typeChart));
						while (type === this.topCard.types[0] && this.topCard.types.length === 1) {
							type = this.sampleOne(Object.keys(Dex.data.typeChart));
						}
						playableCards.push(card.name + ", " + type);
					} else if (card.id === 'conversion2') {
						let types = this.sampleMany(Object.keys(Dex.data.typeChart), 2);
						while (types.sort().join(",") === this.topCard.types.slice().sort().join(",")) {
							types = this.sampleMany(Object.keys(Dex.data.typeChart), 2);
						}
						playableCards.push(card.name + ", " + types.join(", "));
					} else if (card.id === 'transform') {
						let pokemon = this.sampleOne(this.deckPool);
						while (pokemon.species === this.topCard.species) {
							pokemon = this.sampleOne(this.deckPool);
						}
						playableCards.push(card.name + ", " + pokemon.species);
					} else {
						playableCards.push(card.name);
					}
				}
			} else {
				card = card as IPokemonCard;
				pokemon.push(card.species);
				if (this.isPlayableCard(card)) {
					playableCards.push(card.species);
				}
			}
		}
		for (let i = 0; i < actionCards.length; i++) {
			const action = actionCards[i];
			for (let i = 0; i < pokemon.length; i++) {
				playableCards.push(action + ", " + pokemon[i]);
			}
		}
		return playableCards;
	}

	timeEnd() {
		this.say("Time's up!");
		this.end();
	}

	onNextRound() {
		this.currentPlayer = null;
		if (Date.now() - this.startTime! > this.timeLimit) return this.timeEnd();
		const len = this.getRemainingPlayerCount();
		if (!len) {
			this.end();
			return;
		}
		if (len === 1) return this.end();
		const player = this.getNextPlayer();
		if (!player) return;
		const playableCards = this.getPlayableCards(player);
		if (!playableCards.length) {
			this.say(player.name + " doesn't have a card to play and has been eliminated from the game!");
			this.eliminatePlayer(player, "You do not have a card to play!");
			return this.nextRound();
		}
		const text = player.name + "'s turn!";
		this.on(text, () => {
			// left before text appeared
			if (player!.eliminated) {
				this.nextRound();
				return;
			}
			this.currentPlayer = player;
			this.timeout = setTimeout(() => {
				if (!player!.eliminated) {
					this.autoPlay(player!, playableCards);
				} else {
					this.nextRound();
				}
			}, 30 * 1000);
		});
		this.say(text);
	}

	onEnd() {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			this.winners.set(player, 1);
			this.addBits(player, 500);
		}

		this.announceWinners();
	}

	autoPlay(player: Player, playableCards: string[]) {
		let autoplay = '';
		if (playableCards.includes('explosion')) playableCards.splice(playableCards.indexOf('explosion'), 1);
		if (playableCards.length) autoplay = this.sampleOne(playableCards);
		this.say(player.name + " didn't play a card and has been eliminated from the game!" + (autoplay ? " Auto-playing: " + autoplay : ""));
		this.eliminatePlayer(player, "You did not play a card!");
		if (autoplay) {
			player.useCommand('play', autoplay);
		} else {
			this.nextRound();
		}
	}

	playCard(card: IPokemonCard, player: Player, targets: string[], cards: IPokemonCard[]): IPokemonCard[] | boolean {
		if (!this.isPlayableCard(card)) {
			player.say(card.species + " does not have any super-effective STAB against " + this.topCard.species + "!");
			return false;
		}
		this.topCard = card;
		this.showTopCard(card.shiny && !card.played);
		if (!player.eliminated) {
			// if (card.shiny && !card.played) Games.unlockAchievement(this.room, player, 'luck of the draw', this);
			cards.splice(cards.indexOf(card), 1);
			this.drawCard(player, this.roundDrawAmount);
		}
		card.played = true;
		return true;
	}

	playActionCard(card: CardType, player: Player, targets: string[], cards: CardType[]): CardType[] | boolean {
		let showTopCard = true;
		let showHand = false;
		let firstTimeShiny = false;
		let drawAmount = this.roundDrawAmount;
		let drawCards: CardType[] | null = null;
		if (card.id === 'soak') {
			if (this.topCard.types.length === 1 && this.topCard.types[0] === 'Water') {
				this.say(this.topCard.name + " is already pure Water-type!");
				return false;
			}
			this.topCard.types = ['Water'];
		} else if (card.id === 'conversion') {
			const type = Tools.toId(targets[1]);
			if (!type) {
				this.say("Usage: ``" + Config.commandCharacter + "play Conversion, [type]``");
				return false;
			}
			if (!(type in types)) {
				this.say("Please enter a valid type.");
				return false;
			}
			this.topCard.types = [types[type]];
		} else if (card.id === 'conversion2') {
			const type1 = Tools.toId(targets[1]);
			const type2 = Tools.toId(targets[2]);
			if (!type1 || !type2) {
				this.say("Usage: ``" + Config.commandCharacter + "play Conversion 2, [type 1], [type 2]``");
				return false;
			}
			if (!(type1 in types) || !(type2 in types) || type1 === type2) {
				this.say("Please enter two valid types.");
				return false;
			}
			this.topCard.types = [types[type1], types[type2]];
			if (this.isStaleTopCard()) {
				this.say(this.topCard.species + " no longer has any weaknesses!");
				let topCard = this.getCard();
				while (topCard.effectType === 'Move') {
					topCard = this.getCard();
				}
				this.topCard = topCard;
			}
		} else if (card.id === 'trickortreat') {
			if (this.topCard.types.includes('Ghost')) {
				this.say(this.topCard.name + " is already " + (this.topCard.types.length > 1 ? "part " : "") + "Ghost-type!");
				return false;
			}
			this.topCard.types.push("Ghost");
			if (this.isStaleTopCard()) {
				this.say(this.topCard.species + " no longer has any weaknesses!");
				let topCard = this.getCard();
				while (topCard.effectType === 'Move') {
					topCard = this.getCard();
				}
				this.topCard = topCard;
			}
		} else if (card.id === 'forestscurse') {
			if (this.topCard.types.includes('Grass')) {
				this.say(this.topCard.name + " is already " + (this.topCard.types.length > 1 ? "part " : "") + "Grass-type!");
				return false;
			}
			this.topCard.types.push("Grass");
			if (this.isStaleTopCard()) {
				this.say(this.topCard.species + " no longer has any weaknesses!");
				let topCard = this.getCard();
				while (topCard.effectType === 'Move') {
					topCard = this.getCard();
				}
				this.topCard = topCard;
			}
		} else if (card.id === 'explosion') {
			drawAmount = 0;
			showHand = true;
		} else if (card.id === 'recycle') {
			drawAmount = 2;
		} else if (card.id === 'transform') {
			if (!targets[1]) {
				this.say("Usage: ``" + Config.commandCharacter + "play transform, [pokemon]``");
				return false;
			}
			const pokemon = Dex.getPokemon(targets[1]);
			if (!pokemon || pokemon.isNonstandard) {
				this.say("Please enter a valid Pokemon.");
				return false;
			}
			let deckHasSpecies = false;
			for (let i = 0; i < this.deckPool.length; i++) {
				if (this.deckPool[i].species === pokemon.species) {
					deckHasSpecies = true;
					break;
				}
			}
			if (!deckHasSpecies) {
				this.say(pokemon.species + " is not playable in this game.");
				return false;
			}
			this.topCard = Dex.getPokemonCopy(pokemon.species);
			if (this.isStaleTopCard()) {
				this.say(this.topCard.species + " has no weaknesses! Randomly selecting a different Pokemon...");
				let topCard = this.getCard();
				while (topCard.effectType === 'Move') {
					topCard = this.getCard();
				}
				this.topCard = topCard;
			} else {
				if (this.rollForShinyPokemon()) {
					this.topCard.shiny = true;
					firstTimeShiny = true;
					// Games.unlockAchievement(this.room, player, 'luck of the draw', this);
					this.topCard.played = true;
				}
			}
		} else if (card.id === 'topsyturvy') {
			this.say("**The turn order was reversed!**");
			this.playerOrder.reverse();
			const playerIndex = this.playerOrder.indexOf(player);
			this.playerList = this.playerOrder.slice(playerIndex + 1);
			showTopCard = false;
		} else if (card.id === 'teeterdance') {
			this.say("**The turn order was shuffled!**");
			this.playerOrder = this.shuffle(this.playerOrder);
			let index = this.playerOrder.indexOf(player) + 1;
			if (index === this.playerOrder.length) index = 0;
			this.playerList = this.playerOrder.slice(index);
			showTopCard = false;
		} else if (card.id === 'batonpass' || card.id === 'allyswitch') {
			const newId = Tools.toId(targets[1]);
			if (!newId) {
				this.say("Usage: ``" + Config.commandCharacter + "play " + card.name + ", [Pokemon]``");
				return false;
			}
			let newIndex = -1;
			for (let i = 0; i < cards.length; i++) {
				if (cards[i].id === newId) {
					newIndex = i;
					break;
				}
			}
			if (newIndex < 0) {
				if (newId in Dex.data.pokedex) {
					player.say("You don't have [ " + Dex.getExistingPokemon(newId).species + " ].");
				} else {
					player.say("'" + targets[1] + "' isn't a valid Pokemon.");
				}
				return false;
			}
			const card1 = this.getCard();
			const card2 = (card.id === 'batonpass' ? this.getCard() : this.topCard);
			const newTopCard = cards[newIndex] as IPokemonCard;
			this.topCard = newTopCard;
			if (newTopCard.shiny && !newTopCard.played) {
				// Games.unlockAchievement(this.room, player, 'luck of the draw', this);
				firstTimeShiny = true;
				newTopCard.played = true;
			}
			cards.splice(newIndex, 1);
			drawCards = [card1, card2];
		}

		if (showTopCard) this.showTopCard(firstTimeShiny);
		if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);

		if (!player.eliminated) {
			// if (drawAmount > 0 && !this.noDrawing.has(player)) {
			if (drawAmount > 0) {
				this.drawCard(player, drawAmount, drawCards);
			} else if (showHand) {
				this.dealHand(player);
			}
		}

		return true;
	}
}

export const game: IGameFile<AxewsBattleCards> = {
	aliases: ["axews", "abc", "battlecards"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon or move]"],
	commands: Object.assign({}, templateCommands),
	class: AxewsBattleCards,
	description: "Each round, players can play a card that's super-effective against the top card. <a href='http://psgc.weebly.com/axewsbattlecards.html'>Action card descriptions</a>",
	name,
	mascot: "Axew",
	scriptedOnly: true,
};
