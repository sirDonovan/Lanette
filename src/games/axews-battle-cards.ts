import { Player } from "../room-activity";
import { Room } from "../rooms";
import { IGameFile, AchievementsDict } from "../types/games";
import { IPokemon } from "../types/dex";
import { CardType, IActionCardData, IMoveCard, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";
import { User } from "../users";

const types: Dict<string> = {};

const trumpCardEliminations = 5;
const achievements: AchievementsDict = {
	"luckofthedraw": {name: "Luck of the Draw", type: 'shiny', bits: 1000, repeatBits: 250, description: 'draw and play a shiny card'},
	"trumpcard": {name: "Trump Card", type: 'special', bits: 1000, description: 'play a card that eliminates ' +
		trumpCardEliminations + ' or more players'},
};

class AxewsBattleCards extends CardMatching {
	actionCards: Dict<IActionCardData> = {
		"soak": {name: "Soak", description: "Make pure Water type"},
		"trickortreat": {name: "Trick-or-Treat", description: "Add Ghost type"},
		"forestscurse": {name: "Forest's Curse", description: "Add Grass type"},
		"magicpowder": {name: "Magic Powder", description: "Make pure Psychic type"},
		"batonpass": {name: "Baton Pass", description: "Replace top card & draw 2", requiredOtherCards: 1, requiredTarget: true},
		"allyswitch": {name: "Ally Switch", description: "Swap with top card & draw 1", requiredOtherCards: 1, requiredTarget: true},
		"conversion": {name: "Conversion", description: "Change to 1 type", requiredTarget: true},
		"conversion2": {name: "Conversion2", description: "Change to 2 types", requiredTarget: true},
		"transform": {name: "Transform", description: "Change the top card", requiredTarget: true},
		"recycle": {name: "Recycle", description: "Draw 1 card"},
		"teeterdance": {name: "Teeter Dance", description: "Shuffle the turn order"},
		"topsyturvy": {name: "Topsy-Turvy", description: "Reverse the turn order"},
	};
	finitePlayerCards = false;
	maxPlayers = 20;
	playableCardDescription = "You must play a card that is super-effective against the top card";
	roundDrawAmount: number = 1;
	shinyCardAchievement = achievements.luckofthedraw;
	showPlayerCards = false;
	usesColors = false;

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
			this.nextRound();
		}
	}

	filterPoolItem(pokemon: IPokemon): boolean {
		if (this.hasNoWeaknesses(pokemon)) return true;
		return false;
	}

	createDeck(): void {
		const weaknessCounts: Dict<number> = {};
		if (!this.deckPool.length) this.createDeckPool();
		const pokedex = this.shuffle(this.deckPool);
		const deck: CardType[] = [];
		const minimumDeck = ((this.maxPlayers + 1) * this.format.options.cards);
		for (const pokemon of pokedex) {
			const weaknesses = Dex.getWeaknesses(pokemon).join(",");
			if (weaknesses in weaknessCounts && weaknessCounts[weaknesses] >= this.format.options.cards) continue;
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
				const actionCard = this.actionCards[i];
				for (let i = 0; i < actionCardAmount; i++) {
					const card = Dex.getMoveCopy(actionCard.name) as IMoveCard;
					card.action = actionCard;
					deck.push(card);
				}
			}
		}

		this.deck = this.shuffle(deck);
	}

	getCardChatDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card);
	}

	getCardPmDetails(card: IPokemonCard): string {
		return this.getChatTypeLabel(card);
	}

	hasNoWeaknesses(pokemon: IPokemon): boolean {
		let noWeaknesses = true;
		for (const key of Dex.data.typeKeys) {
			const type = Dex.getExistingType(key).name;
			if (!Dex.isImmune(type, pokemon) && Dex.getEffectiveness(type, pokemon) > 0) {
				noWeaknesses = false;
				break;
			}
		}
		return noWeaknesses;
	}

	isStaleTopCard(): boolean {
		return this.hasNoWeaknesses(this.topCard);
	}

	isPlayableCard(card: IPokemonCard, otherCard?: IPokemonCard): boolean {
		if (card === this.topCard) return false;
		if (!otherCard) otherCard = this.topCard;
		let valid = false;
		for (const type of card.types) {
			if (Dex.isImmune(type, otherCard)) {
				continue;
			} else {
				const effectiveness = Dex.getEffectiveness(type, otherCard);
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
		const requiresOtherCards: string[] = [];
		for (let card of cards) {
			if (card.action) {
				card = card as IMoveCard;
				if (card.action!.requiredOtherCards) {
					requiresOtherCards.push(card.name);
				} else if (card.id === 'soak') {
					if (this.topCard.types[0] !== 'Water' || this.topCard.types.length > 1) {
						playableCards.push(card.name);
					}
				} else if (card.id === 'magicpowder') {
					if (this.topCard.types[0] !== 'Psychic' || this.topCard.types.length > 1) {
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
				} else if (card.id === 'conversion') {
					let type = Dex.getExistingType(this.sampleOne(Dex.data.typeKeys)).name;
					while (type === this.topCard.types[0] && this.topCard.types.length === 1) {
						type = Dex.getExistingType(this.sampleOne(Dex.data.typeKeys)).name;
					}
					playableCards.push(card.name + ", " + type);
				} else if (card.id === 'conversion2') {
					let types = this.sampleMany(Dex.data.typeKeys, 2).map(x => Dex.getExistingType(x).name);
					if (this.topCard.types.length === 2) {
						while (types.sort().join(",") === this.topCard.types.slice().sort().join(",")) {
							types = this.sampleMany(Dex.data.typeKeys, 2).map(x => Dex.getExistingType(x).name);
						}
					}
					playableCards.push(card.name + ", " + types.join(", "));
				} else if (card.id === 'transform') {
					let pokemon = this.sampleOne(this.deckPool);
					while (pokemon.name === this.topCard.name) {
						pokemon = this.sampleOne(this.deckPool);
					}
					playableCards.push(card.name + ", " + pokemon.name);
				} else {
					playableCards.push(card.name);
				}
			} else {
				card = card as IPokemonCard;
				pokemon.push(card.name);
				if (this.isPlayableCard(card)) {
					playableCards.push(card.name);
				}
			}
		}

		for (const action of requiresOtherCards) {
			for (const name of pokemon) {
				playableCards.push(action + ", " + name);
			}
		}
		return playableCards;
	}

	timeEnd(): void {
		this.say("Time is up!");
		this.end();
	}

	onNextRound(): void {
		this.canPlay = false;
		if (this.currentPlayer) {
			this.lastPlayer = this.currentPlayer;
			this.currentPlayer = null;
		}
		if (Date.now() - this.startTime! > this.timeLimit) return this.timeEnd();
		if (this.getRemainingPlayerCount() <= 1) {
			this.end();
			return;
		}
		let player = this.getNextPlayer();
		if (!player || this.timeEnded) return;

		const eliminatedText = "does not have a card to play and has been eliminated from the game!";
		let playableCards = this.getPlayableCards(player);
		let eliminateCount = 0;
		let finalPlayer = false;
		while (!playableCards.length) {
			eliminateCount++;
			this.eliminatePlayer(player, "You do not have a card to play!");
			if (this.getRemainingPlayerCount() === 1) {
				finalPlayer = true;
				break;
			}
			this.say(player.name + " " + eliminatedText);
			player = this.getNextPlayer();
			if (!player) {
				if (this.timeEnded) break;
				throw new Error("No player given by Game.getNextPlayer");
			}
			playableCards = this.getPlayableCards(player);
		}

		if (this.lastPlayer && eliminateCount >= trumpCardEliminations && !this.lastPlayer.eliminated) {
			this.unlockAchievement(this.lastPlayer, achievements.trumpcard!);
		}

		if (this.timeEnded) return;

		// needs to be set outside of on() for tests
		this.currentPlayer = player;

		const html = this.getNameSpan() + "<br /><center>" + this.getTopCardHtml() + "<br /><br /><b>" + player!.name + "</b>'s " +
			"turn!</center>";
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			if (finalPlayer) {
				this.say(player!.name + " " + eliminatedText);
				this.end();
				return;
			}

			// left before text appeared
			if (player!.eliminated) {
				this.nextRound();
				return;
			}

			this.awaitingCurrentPlayerCard = true;
			this.canPlay = true;
			this.dealHand(player!);

			this.timeout = setTimeout(() => {
				this.say(player!.name + " it is your turn!");

				this.timeout = setTimeout(() => {
					if (!player!.eliminated) {
						this.autoPlay(player!, playableCards);
					} else {
						this.nextRound();
					}
				}, this.turnTimeAfterHighlight);
			}, this.turnTimeBeforeHighlight);
		});

		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			this.winners.set(player, 1);
			this.addBits(player, 500);
		}

		this.announceWinners();
	}

	autoPlay(player: Player, playableCards: string[]): void {
		let autoplay = '';
		if (playableCards.length) autoplay = this.sampleOne(playableCards);
		this.say(player.name + " did not play a card and has been eliminated from the game!" + (autoplay ? " Auto-playing: " +
			autoplay : ""));
		this.eliminatePlayer(player, "You did not play a card!");
		if (autoplay) {
			player.useCommand('play', autoplay);
		} else {
			this.nextRound();
		}
	}

	playActionCard(card: CardType, player: Player, targets: string[], cards: CardType[]): CardType[] | boolean {
		let drawAmount = this.roundDrawAmount;
		let firstTimeShiny = false;
		let drawCards: CardType[] | null = null;
		let cardDetail: string | undefined;
		if (card.id === 'soak') {
			if (this.topCard.types.length === 1 && this.topCard.types[0] === 'Water') {
				this.say(this.topCard.name + " is already pure Water-type!");
				return false;
			}
			this.topCard.types = ['Water'];
		} else if (card.id === 'magicpowder') {
			if (this.topCard.types.length === 1 && this.topCard.types[0] === 'Psychic') {
				this.say(this.topCard.name + " is already pure Psychic-type!");
				return false;
			}
			this.topCard.types = ['Psychic'];
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
			cardDetail = types[type];
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
			cardDetail = types[type1] + ", " + types[type2];
			if (this.isStaleTopCard()) {
				this.say(this.topCard.name + " no longer has any weaknesses!");
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
				this.say(this.topCard.name + " no longer has any weaknesses!");
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
				this.say(this.topCard.name + " no longer has any weaknesses!");
				let topCard = this.getCard();
				while (topCard.effectType === 'Move') {
					topCard = this.getCard();
				}
				this.topCard = topCard;
			}
		} else if (card.id === 'recycle') {
			drawAmount = 2;
		} else if (card.id === 'transform') {
			if (!targets[1]) {
				this.say("Usage: ``" + Config.commandCharacter + "play transform, [pokemon]``");
				return false;
			}
			const pokemon = Dex.getPokemon(targets[1]);
			if (!pokemon) {
				this.say("Please enter a valid Pokemon.");
				return false;
			}
			let deckHasSpecies = false;
			for (const card of this.deckPool) {
				if (card.name === pokemon.name) {
					deckHasSpecies = true;
					break;
				}
			}
			if (!deckHasSpecies) {
				this.say(pokemon.name + " is not playable in this game.");
				return false;
			}
			const newTopCard = Dex.getPokemonCopy(pokemon.name);
			if (this.rollForShinyPokemon()) {
				newTopCard.shiny = true;
				firstTimeShiny = true;
			}
			this.setTopCard(newTopCard, player);
			cardDetail = pokemon.name;
			if (this.isStaleTopCard()) {
				this.say(this.topCard.name + " has no weaknesses! Randomly selecting a different Pokemon...");
				let topCard = this.getCard();
				while (topCard.effectType === 'Move') {
					topCard = this.getCard();
				}
				this.topCard = topCard;
			}
		} else if (card.id === 'topsyturvy') {
			this.say("**The turn order was reversed!**");
			this.playerOrder.reverse();
			const playerIndex = this.playerOrder.indexOf(player);
			this.playerList = this.playerOrder.slice(playerIndex + 1);
		} else if (card.id === 'teeterdance') {
			this.say("**The turn order was shuffled!**");
			this.playerOrder = this.shuffle(this.playerOrder);
			let index = this.playerOrder.indexOf(player) + 1;
			if (index === this.playerOrder.length) index = 0;
			this.playerList = this.playerOrder.slice(index);
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
				const pokemon = Dex.getPokemon(newId);
				if (pokemon) {
					player.say("You do not have [ " + pokemon.name + " ].");
				} else {
					player.say("'" + targets[1] + "' is not a valid Pokemon.");
				}
				return false;
			}
			const card1 = this.getCard();
			const card2 = (card.id === 'batonpass' ? this.getCard() : this.topCard);
			const newTopCard = cards[newIndex] as IPokemonCard;
			if (newTopCard.shiny && !newTopCard.played) firstTimeShiny = true;
			this.setTopCard(newTopCard, player);
			cards.splice(newIndex, 1);
			drawCards = [card1, card2];
			cardDetail = newTopCard.name;
		}

		this.awaitingCurrentPlayerCard = false;

		if (cards.includes(card)) cards.splice(cards.indexOf(card), 1);
		this.storePreviouslyPlayedCard({card: card.displayName || card.name, detail: cardDetail, shiny: firstTimeShiny});

		if (!player.eliminated) {
			if (drawAmount > 0) {
				this.drawCard(player, drawAmount, drawCards);
			}
		}

		return true;
	}
}

export const game: IGameFile<AxewsBattleCards> = Games.copyTemplateProperties(cardGame, {
	achievements,
	aliases: ["axews", "abc", "battlecards"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon or move]"],
	class: AxewsBattleCards,
	description: "Each round, players can play a card that's super-effective against the top card. " +
		"<a href='http://psgc.weebly.com/axewsbattlecards.html'>Action card descriptions</a>",
	name: "Axew's Battle Cards",
	mascot: "Axew",
	scriptedOnly: true,
});
