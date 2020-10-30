import type { Player } from "../room-activity";
import { assert, assertStrictEqual } from "../test/test-tools";
import type { GameFileTests, IGameAchievement, IGameFile } from "../types/games";
import type { IMoveCopy, IPokemon } from "../types/pokemon-showdown";
import type { IActionCardData, ICard, IMoveCard, IPokemonCard } from "./templates/card";
import { CardMatching, game as cardGame } from "./templates/card-matching";

type AchievementNames = "luckofthedraw" | "trumpcard";
type ActionCardsType = Dict<IActionCardData<AxewsBattleCards>>;

const usableTypes: Dict<string> = {};

const trumpCardEliminations = 5;

class AxewsBattleCards extends CardMatching<ActionCardsType> {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"luckofthedraw": {name: "Luck of the Draw", type: 'shiny', bits: 1000, repeatBits: 250, description: 'draw and play a shiny card'},
		"trumpcard": {name: "Trump Card", type: 'special', bits: 1000, description: 'play a card that eliminates ' +
			trumpCardEliminations + ' or more players'},
	};

	actionCards: ActionCardsType = {
		"soak": {
			name: "Soak",
			description: "Make pure Water type",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.types.length === 1 && game.topCard.types[0] === 'Water') {
					if (player) player.say(game.topCard.name + " is already pure Water-type!");
					return false;
				}
				return true;
			},
		},
		"trickortreat": {
			name: "Trick-or-Treat",
			description: "Add Ghost type",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.types.includes('Ghost')) {
					if (player) {
						player.say(game.topCard.name + " is already " + (game.topCard.types.length > 1 ? "part " : "") + "Ghost-type!");
					}
					return false;
				}

				return true;
			},
		},
		"forestscurse": {
			name: "Forest's Curse",
			description: "Add Grass type",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.types.includes('Grass')) {
					if (player) {
						player.say(game.topCard.name + " is already " + (game.topCard.types.length > 1 ? "part " : "") + "Grass-type!");
					}
					return false;
				}

				return true;
			},
		},
		"magicpowder": {
			name: "Magic Powder",
			description: "Make pure Psychic type",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget(game) {
				if (this.isPlayableTarget(game, [])) {
					return this.name;
				}
			},
			isPlayableTarget(game, targets, hand, player) {
				if (game.topCard.types.length === 1 && game.topCard.types[0] === 'Psychic') {
					if (player) player.say(game.topCard.name + " is already pure Psychic-type!");
					return false;
				}
				return true;
			},
		},
		"batonpass": {
			name: "Baton Pass",
			description: "Replace top card & draw 2",
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
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
					let hasCard = false;
					for (const card of hand) {
						if (card.name === pokemon.name) {
							hasCard = true;
							break;
						}
					}

					if (!hasCard) {
						if (player) player.say("You do not have [ " + pokemon.name + " ].");
						return false;
					}
				}

				if (game.topCard.name === pokemon.name) {
					if (player) player.say("The top card is already " + pokemon.name + ".");
					return false;
				}

				return true;
			},
		},
		"allyswitch": {
			name: "Ally Switch",
			description: "Swap with top card & draw 1",
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
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
					let hasCard = false;
					for (const card of hand) {
						if (card.name === pokemon.name) {
							hasCard = true;
							break;
						}
					}

					if (!hasCard) {
						if (player) player.say("You do not have [ " + pokemon.name + " ].");
						return false;
					}
				}

				if (game.topCard.name === pokemon.name) {
					if (player) player.say("The top card is already " + pokemon.name + ".");
					return false;
				}

				return true;
			},
		},
		"conversion": {
			name: "Conversion",
			description: "Change to 1 type",
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game) {
				let targets: string[] = [Dex.getExistingType(game.sampleOne(Dex.data.typeKeys)).name];
				while (!this.isPlayableTarget(game, targets)) {
					targets = [Dex.getExistingType(game.sampleOne(Dex.data.typeKeys)).name];
				}

				return this.name + ", " + targets[0];
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				if (targets.length !== 1) {
					if (player) player.say("You must specify 1 type.");
					return false;
				}

				const type = Tools.toId(targets[0]);
				if (!type) {
					if (player) player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [type]``");
					return false;
				}

				if (!(type in usableTypes)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[0]]));
					return false;
				}

				if (game.topCard.types.length === 1 && usableTypes[type] === game.topCard.types[0]) {
					if (player) player.say("The top card is already " + usableTypes[type] + " type.");
					return false;
				}

				return true;
			},
		},
		"conversion2": {
			name: "Conversion 2",
			description: "Change to 2 types",
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game) {
				let types = game.sampleMany(Dex.data.typeKeys, 2).map(x => Dex.getExistingType(x).name);
				while (!this.isPlayableTarget(game, types)) {
					types = game.sampleMany(Dex.data.typeKeys, 2).map(x => Dex.getExistingType(x).name);
				}

				return this.name + ", " + types.join(", ");
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				if (targets.length !== 2) {
					if (player) player.say("You must specify 2 types.");
					return false;
				}

				const type1 = Tools.toId(targets[0]);
				const type2 = Tools.toId(targets[1]);
				if (!type1 || !type2) {
					if (player) player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [type 1], [type 2]``");
					return false;
				}

				if (!(type1 in usableTypes)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[0]]));
					return false;
				}

				if (!(type2 in usableTypes)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[1]]));
					return false;
				}

				if (type1 === type2) {
					if (player) player.say("Please enter two unique types.");
					return false;
				}

				if (game.topCard.types.length === 2) {
					const typesList = [usableTypes[type1], usableTypes[type2]];
					if (game.topCard.types.slice().sort().join(",") === typesList.sort().join(",")) {
						if (player) player.say("The top card already " + typesList.join("/") + " type.");
						return false;
					}
				}

				return true;
			},
		},
		"conversionz": {
			name: "Conversion Z",
			description: "Change to 3 types",
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game) {
				let types = game.sampleMany(Dex.data.typeKeys, 3).map(x => Dex.getExistingType(x).name);
				while (!this.isPlayableTarget(game, types)) {
					types = game.sampleMany(Dex.data.typeKeys, 3).map(x => Dex.getExistingType(x).name);
				}

				return this.name + ", " + types.join(", ");
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
				if (targets.length !== 3) {
					if (player) player.say("You must specify 3 types.");
					return false;
				}

				const type1 = Tools.toId(targets[0]);
				const type2 = Tools.toId(targets[1]);
				const type3 = Tools.toId(targets[2]);
				if (!type1 || !type2 || !type3) {
					if (player) {
						player.say("Usage: ``" + Config.commandCharacter + "play " + this.name + ", [type 1], [type 2], [type 3]``");
					}
					return false;
				}

				if (!(type1 in usableTypes)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[0]]));
					return false;
				}

				if (!(type2 in usableTypes)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[1]]));
					return false;
				}

				if (!(type3 in usableTypes)) {
					if (player) player.say(CommandParser.getErrorText(['invalidType', targets[2]]));
					return false;
				}

				if (type1 === type2 || type1 === type3 || type2 === type3) {
					if (player) player.say("Please enter three unique types.");
					return false;
				}

				if (game.topCard.types.length === 3) {
					const typesList = [usableTypes[type1], usableTypes[type2], usableTypes[type3]];
					if (game.topCard.types.slice().sort().join(",") === typesList.sort().join(",")) {
						if (player) player.say("The top card already " + typesList.join("/") + " type.");
						return false;
					}
				}

				return true;
			},
		},
		"transform": {
			name: "Transform",
			description: "Change the top card",
			requiredTarget: true,
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getRandomTarget(game) {
				let targets = [game.sampleOne(game.deckPool).name];
				while (!this.isPlayableTarget(game, targets)) {
					targets = [game.sampleOne(game.deckPool).name];
				}
				return this.name + ", " + targets[0];
			},
			getAutoPlayTarget(game, hand) {
				return this.getRandomTarget!(game, hand);
			},
			isPlayableTarget(game, targets, hand, player) {
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

				let deckHasSpecies = false;
				for (const card of game.deckPool) {
					if (card.name === pokemon.name) {
						deckHasSpecies = true;
						break;
					}
				}

				if (!deckHasSpecies) {
					if (player) player.say(pokemon.name + " is not playable in this game.");
					return false;
				}

				if (game.topCard.name === pokemon.name) {
					if (player) player.say("The top card is already " + pokemon.name + ".");
					return false;
				}

				return true;
			},
		},
		"protect": {
			name: "Protect",
			description: "Skip your turn",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget() {
				return this.name;
			},
			isPlayableTarget() {
				return true;
			},
		},
		"teeterdance": {
			name: "Teeter Dance",
			description: "Shuffle the turn order",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget() {
				return this.name;
			},
			isPlayableTarget() {
				return true;
			},
		},
		"topsyturvy": {
			name: "Topsy-Turvy",
			description: "Reverse the turn order",
			getCard(game) {
				return game.moveToActionCard(this);
			},
			getAutoPlayTarget() {
				return this.name;
			},
			isPlayableTarget() {
				return true;
			},
		},
	};
	finitePlayerCards = false;
	hackmonsTypes: boolean = false;
	lives = new Map<Player, number>();
	maxPlayers = 20;
	playableCardDescription = "You must play a card that is super-effective against the top card";
	roundDrawAmount: number = 1;
	shinyCardAchievement = AxewsBattleCards.achievements.luckofthedraw;
	showPlayerCards = false;
	startingLives: number = 1;
	usesColors = false;

	static loadData(): void {
		for (const key of Dex.data.typeKeys) {
			const type = Dex.getExistingType(key);
			usableTypes[type.id] = type.name;
			usableTypes[type.id + 'type'] = type.name;
		}
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

	filterForme(forme: IPokemon): boolean {
		const baseSpecies = Dex.getExistingPokemon(forme.baseSpecies);
		if (!Tools.compareArrays(baseSpecies.types, forme.types) &&
			!(baseSpecies.name === "Arceus" || baseSpecies.name === "Silvally")) return true;
		return false;
	}

	createDeck(): void {
		const weaknessCounts: Dict<number> = {};
		if (!this.deckPool.length) this.createDeckPool();
		const deckPool = this.shuffle(this.deckPool);
		const deck: ICard[] = [];
		const minimumDeck = (this.maxPlayers + 1) * this.format.options.cards;
		for (const card of deckPool) {
			if (!this.usesActionCards && card.types.join("") === "Normal") continue;

			const weaknesses = Dex.getWeaknesses(Dex.getExistingPokemon(card.name)).join(",");
			if (weaknesses in weaknessCounts && weaknessCounts[weaknesses] >= this.format.options.cards) continue;
			if (!(weaknesses in weaknessCounts)) weaknessCounts[weaknesses] = 0;
			weaknessCounts[weaknesses]++;

			if (this.rollForShinyPokemon()) card.shiny = true;
			deck.push(card);
		}

		if (deck.length < minimumDeck) {
			this.createDeck();
			return;
		}

		const actionCardKeysLength = Object.keys(this.actionCards).length;
		if (actionCardKeysLength && this.usesActionCards) {
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
			for (const actionCardId in this.actionCards) {
				const actionCard = this.actionCards[actionCardId];
				for (let i = 0; i < actionCardAmount; i++) {
					let move: IMoveCopy;
					if (actionCard.name === "Conversion Z") {
						move = Dex.getMoveCopy("Conversion 2");
						move.name = "Conversion Z";
						move.id = "conversionz";
					} else {
						move = Dex.getMoveCopy(actionCard.name);
					}

					const card = this.moveToCard(move);
					// @ts-expect-error
					card.action = actionCard;
					deck.push(card);
				}
			}
		}

		this.deck = this.shuffle(deck);
	}

	getTypingKey(types: readonly string[]): string {
		return types.slice().sort().join(',');
	}

	getHackmonsTyping(originalTypes: readonly string[]): readonly string[] {
		const originalKey = this.getTypingKey(originalTypes);
		const typeKeys = this.shuffle(Dex.data.typeKeys);

		let newTypes: string[] = [];
		let newKey = '';
		while (!newKey || newKey === originalKey) {
			if (this.random(2)) {
				newTypes = [Dex.getExistingType(typeKeys[0]).name, Dex.getExistingType(typeKeys[1]).name];
			} else {
				newTypes = [Dex.getExistingType(typeKeys[0]).name];
			}
			newKey = this.getTypingKey(newTypes);
		}

		return newTypes;
	}

	getCard(): ICard {
		const card = super.getCard() as IPokemonCard;
		if (!card.action && this.hackmonsTypes) {
			card.types = this.getHackmonsTyping(card.types);
		}

		return card;
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
		return this.hasNoWeaknesses(Dex.getExistingPokemon(this.topCard.name));
	}

	checkTopCardStaleness(message?: string): void {
		if (this.isStaleTopCard()) {
			this.say(message || this.topCard.name + " no longer has any weaknesses!");
			let topCard = this.getCard();
			while (topCard.action) {
				topCard = this.getCard();
			}
			this.topCard = topCard as IPokemonCard;
		}
	}

	isPlayableCard(card: IPokemonCard, otherCard?: IPokemonCard): boolean {
		if (card === this.topCard || card === otherCard) return false;
		if (!otherCard) otherCard = this.topCard;

		let valid = false;
		for (const type of card.types) {
			if (Dex.isImmune(type, otherCard.types)) {
				continue;
			} else {
				const effectiveness = Dex.getEffectiveness(type, otherCard.types);
				if (effectiveness > 0) {
					valid = true;
					break;
				}
			}
		}

		return valid;
	}

	arePlayableCards(): boolean {
		return true;
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

		const currentRound = this.round;
		let player = this.getNextPlayer();
		if (!player || this.timeEnded) return;

		const eliminatedText = "does not have a card to play and has been eliminated from the game!";
		let playableCards = this.getPlayableCards(player);
		let eliminateCount = 0;
		let finalPlayer = false;
		const useUhtmlAuto = this.round === currentRound && !!playableCards.length;
		while (!playableCards.length) {
			const lives = this.addLives(player, -1);
			if (!lives) {
				eliminateCount++;
				this.eliminatePlayer(player, "You do not have a card to play!");
				if (this.getRemainingPlayerCount() === 1) {
					finalPlayer = true;
					break;
				}
				this.say(player.name + " " + eliminatedText);
			} else {
				this.say(player.name + " does not have a card to play and has lost a life!");
				player.say("You do not have a card to play! You have " + lives + " " +
					(lives === 1 ? "life" : "lives") + " remaining!");
			}

			player = this.getNextPlayer();
			if (!player) {
				if (this.timeEnded) break; // eslint-disable-line @typescript-eslint/no-unnecessary-condition
				throw new Error("No player given by Game.getNextPlayer");
			}
			playableCards = this.getPlayableCards(player);
		}

		if (this.lastPlayer && eliminateCount >= trumpCardEliminations && !this.lastPlayer.eliminated) {
			this.unlockAchievement(this.lastPlayer, AxewsBattleCards.achievements.trumpcard);
		}

		if (this.timeEnded) return; // eslint-disable-line @typescript-eslint/no-unnecessary-condition

		// needs to be set outside of on() for tests
		this.currentPlayer = player;

		const html = this.getMascotAndNameHtml() + "<br /><center>" + this.getTopCardHtml() + "<br /><br /><b><username>" + player!.name +
			"</username></b>'s turn!</center>";
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
			this.updatePlayerHtmlPage(player!);
			player!.sendHighlightPage("It is your turn!");

			this.timeout = setTimeout(() => {
				if (!player!.eliminated) {
					this.autoPlay(player!, playableCards);
				} else {
					this.nextRound();
				}
			}, this.turnTimeLimit);
		});

		if (useUhtmlAuto) {
			this.sayUhtmlAuto(uhtmlName, html);
		} else {
			this.sayUhtml(uhtmlName, html);
		}
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

	playActionCard(card: IMoveCard, player: Player, targets: string[], cards: ICard[]): ICard[] | boolean {
		if (!card.action) throw new Error("playActionCard called with a regular card");
		if (!card.action.isPlayableTarget(this, targets, cards, player)) return false;

		let firstTimeShiny = false;
		let drawCards: ICard[] | null = null;
		let cardDetail: string | undefined;
		if (card.id === 'soak') {
			this.topCard.types = ['Water'];
		} else if (card.id === 'magicpowder') {
			this.topCard.types = ['Psychic'];
		} else if (card.id === 'conversion') {
			const type = Tools.toId(targets[0]);
			this.topCard.types = [usableTypes[type]];
			cardDetail = usableTypes[type];
		} else if (card.id === 'conversion2') {
			const type1 = Tools.toId(targets[0]);
			const type2 = Tools.toId(targets[1]);
			this.topCard.types = [usableTypes[type1], usableTypes[type2]];
			cardDetail = usableTypes[type1] + ", " + usableTypes[type2];

			this.checkTopCardStaleness();
		} else if (card.id === 'conversionz') {
			const type1 = Tools.toId(targets[0]);
			const type2 = Tools.toId(targets[1]);
			const type3 = Tools.toId(targets[2]);
			this.topCard.types = [usableTypes[type1], usableTypes[type2], usableTypes[type3]];
			cardDetail = usableTypes[type1] + ", " + usableTypes[type2] + ", " + usableTypes[type3];

			this.checkTopCardStaleness();
		} else if (card.id === 'trickortreat') {
			const topCardTypes = this.topCard.types.slice();
			topCardTypes.push("Ghost");
			this.topCard.types = topCardTypes;
			this.checkTopCardStaleness();
		} else if (card.id === 'forestscurse') {
			const topCardTypes = this.topCard.types.slice();
			topCardTypes.push("Grass");
			this.topCard.types = topCardTypes;
			this.checkTopCardStaleness();
		} else if (card.id === 'transform') {
			const newTopCard = this.pokemonToCard(Dex.getExistingPokemon(targets[0]));
			if (this.hackmonsTypes) {
				newTopCard.types = this.getHackmonsTyping(newTopCard.types);
			}
			if (this.rollForShinyPokemon()) {
				newTopCard.shiny = true;
				firstTimeShiny = true;
			}
			this.setTopCard(newTopCard, player);
			cardDetail = newTopCard.name;

			this.checkTopCardStaleness(this.topCard.name + " has no weaknesses! Randomly selecting a different Pokemon...");
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
			const pokemon = Dex.getExistingPokemon(targets[0]);
			let newIndex = -1;
			for (let i = 0; i < cards.length; i++) {
				if (cards[i].name === pokemon.name) {
					newIndex = i;
					break;
				}
			}

			const card1 = this.getCard();
			const card2 = card.id === 'batonpass' ? this.getCard() : this.topCard;
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
			this.currentPlayer = null;
			const drawnCards = this.drawCard(player, this.roundDrawAmount, drawCards);
			this.updatePlayerHtmlPage(player, drawnCards);
		}

		return true;
	}
}

const tests: GameFileTests<AxewsBattleCards> = {
	'it should use card types in isPlayableCard()': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const golem = game.pokemonToCard(Dex.getExistingPokemon("Golem"));
			const squirtle = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			const bulbasaur = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			const charmander = game.pokemonToCard(Dex.getExistingPokemon("Charmander"));
			const pikachu = game.pokemonToCard(Dex.getExistingPokemon("Pikachu"));

			assertStrictEqual(game.isPlayableCard(golem, golem), false);
			assertStrictEqual(game.isPlayableCard(charmander, golem), false);
			assertStrictEqual(game.isPlayableCard(pikachu, golem), false);
			assertStrictEqual(game.isPlayableCard(squirtle, golem), true);
			assertStrictEqual(game.isPlayableCard(bulbasaur, golem), true);

			golem.types = ['Water'];
			assertStrictEqual(game.isPlayableCard(charmander, golem), false);
			assertStrictEqual(game.isPlayableCard(pikachu, golem), true);
			assertStrictEqual(game.isPlayableCard(squirtle, golem), false);
			assertStrictEqual(game.isPlayableCard(bulbasaur, golem), true);
		},
	},
	'action cards - soak': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const soak = game.actionCards.soak;
			assert(soak);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(soak.getAutoPlayTarget(game, []));
			assertStrictEqual(soak.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Poliwrath"));
			assert(soak.getAutoPlayTarget(game, []));
			assertStrictEqual(soak.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(!soak.getAutoPlayTarget(game, []));
			assertStrictEqual(soak.isPlayableTarget(game, []), false);
		},
	},
	'action cards - trickortreat': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const trickortreat = game.actionCards.trickortreat;
			assert(trickortreat);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(trickortreat.getAutoPlayTarget(game, []));
			assertStrictEqual(trickortreat.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Gastly"));
			assert(!trickortreat.getAutoPlayTarget(game, []));
			assertStrictEqual(trickortreat.isPlayableTarget(game, []), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Duskull"));
			assert(!trickortreat.getAutoPlayTarget(game, []));
			assertStrictEqual(trickortreat.isPlayableTarget(game, []), false);
		},
	},
	'action cards - forestscurse': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const forestscurse = game.actionCards.forestscurse;
			assert(forestscurse);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(forestscurse.getAutoPlayTarget(game, []));
			assertStrictEqual(forestscurse.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(!forestscurse.getAutoPlayTarget(game, []));
			assertStrictEqual(forestscurse.isPlayableTarget(game, []), false);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Tangela"));
			assert(!forestscurse.getAutoPlayTarget(game, []));
			assertStrictEqual(forestscurse.isPlayableTarget(game, []), false);
		},
	},
	'action cards - magicpowder': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const magicpowder = game.actionCards.magicpowder;
			assert(magicpowder);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(magicpowder.getAutoPlayTarget(game, []));
			assertStrictEqual(magicpowder.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Slowpoke"));
			assert(magicpowder.getAutoPlayTarget(game, []));
			assertStrictEqual(magicpowder.isPlayableTarget(game, []), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Abra"));
			assert(!magicpowder.getAutoPlayTarget(game, []));
			assertStrictEqual(magicpowder.isPlayableTarget(game, []), false);
		},
	},
	'action cards - batonpass': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const batonpass = game.actionCards.batonpass;
			assert(batonpass);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			let hand = [game.pokemonToCard(Dex.getExistingPokemon("Squirtle"))];
			assert(batonpass.getAutoPlayTarget(game, hand));
			assertStrictEqual(batonpass.isPlayableTarget(game, ["Squirtle"], hand), true);
			assertStrictEqual(batonpass.isPlayableTarget(game, ["Charmander"], hand), false);
			assertStrictEqual(batonpass.isPlayableTarget(game, [""], hand), false);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"))];
			assert(!batonpass.getAutoPlayTarget(game, hand));
			assertStrictEqual(batonpass.isPlayableTarget(game, ["Bulbasaur"], hand), false);
		},
	},
	'action cards - allyswitch': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const allyswitch = game.actionCards.allyswitch;
			assert(allyswitch);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			let hand = [game.pokemonToCard(Dex.getExistingPokemon("Squirtle"))];
			assert(allyswitch.getAutoPlayTarget(game, hand));
			assertStrictEqual(allyswitch.isPlayableTarget(game, ["Squirtle"], hand), true);
			assertStrictEqual(allyswitch.isPlayableTarget(game, ["Charmander"], hand), false);
			assertStrictEqual(allyswitch.isPlayableTarget(game, [""], hand), false);

			hand = [game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"))];
			assert(!allyswitch.getAutoPlayTarget(game, hand));
			assertStrictEqual(allyswitch.isPlayableTarget(game, ["Bulbasaur"], hand), false);
		},
	},
	'action cards - conversion': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const conversion = game.actionCards.conversion;
			assert(conversion);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(conversion.getAutoPlayTarget(game, []));
			assertStrictEqual(conversion.isPlayableTarget(game, ["Grass"]), true);
			assertStrictEqual(conversion.isPlayableTarget(game, ["Poison"]), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(conversion.getAutoPlayTarget(game, []));
			assertStrictEqual(conversion.isPlayableTarget(game, ["Grass"]), true);
			assertStrictEqual(conversion.isPlayableTarget(game, ["Water"]), false);
			assertStrictEqual(conversion.isPlayableTarget(game, [""]), false);
			assertStrictEqual(conversion.isPlayableTarget(game, ["Grass", "Fire"]), false);
		},
	},
	'action cards - conversion2': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const conversion2 = game.actionCards['conversion2'];
			assert(conversion2);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(conversion2.getAutoPlayTarget(game, []));
			assertStrictEqual(conversion2.isPlayableTarget(game, ["Water", "Fire"]), true);
			assertStrictEqual(conversion2.isPlayableTarget(game, ["Grass", "Poison"]), false);
			assertStrictEqual(conversion2.isPlayableTarget(game, ["Poison", "Grass"]), false);
			assertStrictEqual(conversion2.isPlayableTarget(game, ["Water"]), false);
			assertStrictEqual(conversion2.isPlayableTarget(game, [""]), false);
		},
	},
	'action cards - conversionz': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const conversionz = game.actionCards.conversionz;
			assert(conversionz);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Squirtle"));
			assert(conversionz.getAutoPlayTarget(game, []));
			assertStrictEqual(conversionz.isPlayableTarget(game, ["Water", "Fire", "Flying"]), true);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			game.topCard.types = ["Grass", "Poison", "Ghost"];
			assert(conversionz.getAutoPlayTarget(game, []));
			assertStrictEqual(conversionz.isPlayableTarget(game, ["Water", "Fire", "Flying"]), true);
			assertStrictEqual(conversionz.isPlayableTarget(game, [""]), false);
			assertStrictEqual(conversionz.isPlayableTarget(game, ["Water"]), false);
			assertStrictEqual(conversionz.isPlayableTarget(game, ["Water", "Fire"]), false);
			assertStrictEqual(conversionz.isPlayableTarget(game, ["Grass", "Poison", "Ghost"]), false);
		},
	},
	'action cards - transform': {
		test(game): void {
			if (game.hackmonsTypes) return;
			game.createDeckPool();

			const transform = game.actionCards.transform;
			assert(transform);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(transform.getAutoPlayTarget(game, []));
			assertStrictEqual(transform.isPlayableTarget(game, ["Squirtle"]), true);
			assertStrictEqual(transform.isPlayableTarget(game, ["Bulbasaur"]), false);
			assertStrictEqual(transform.isPlayableTarget(game, [""]), false);
		},
	},
	'action cards - protect': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const protect = game.actionCards.protect;
			assert(protect);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(protect.getAutoPlayTarget(game, []));
			assertStrictEqual(protect.isPlayableTarget(game, []), true);
		},
	},
	'action cards - teeterdance': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const teeterdance = game.actionCards.teeterdance;
			assert(teeterdance);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(teeterdance.getAutoPlayTarget(game, []));
			assertStrictEqual(teeterdance.isPlayableTarget(game, []), true);
		},
	},
	'action cards - topsyturvy': {
		test(game): void {
			if (game.hackmonsTypes) return;

			const topsyturvy = game.actionCards.topsyturvy;
			assert(topsyturvy);

			game.topCard = game.pokemonToCard(Dex.getExistingPokemon("Bulbasaur"));
			assert(topsyturvy.getAutoPlayTarget(game, []));
			assertStrictEqual(topsyturvy.isPlayableTarget(game, []), true);
		},
	},
};

export const game: IGameFile<AxewsBattleCards> = Games.copyTemplateProperties(cardGame, {
	aliases: ["axews", "abc", "battlecards"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon or move]"],
	class: AxewsBattleCards,
	description: "Each round, players can play a card that's super-effective against the top card. " +
		"<a href='http://psgc.weebly.com/axewsbattlecards.html'>Action card descriptions</a>",
	name: "Axew's Battle Cards",
	mascot: "Axew",
	scriptedOnly: true,
	tests,
	variants: [
		{
			name: "No Actions Axew's Battle Cards",
			maxPlayers: 25,
			startingLives: 2,
			variantAliases: ["No Actions", "No Action", "No Action Card", "No Action Cards"],
			usesActionCards: false,
		},
		{
			name: "Hackmons Axew's Battle Cards",
			variantAliases: ["Hackmons", "Hackmons Cup"],
			hackmonsTypes: true,
		},
	],
});
