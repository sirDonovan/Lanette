import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";
import type { IPokemon, ITypeData } from "../types/pokemon-showdown";

interface IPreviousGuess {
	parameters: string;
	correct: boolean;
}

const MAX_ROUND_PARAMETERS = 5;

const USABLE_STATS	 = ["hp", "hitpoints", "atk", "attack", "def", "defense", "spa", "spatk", "specialattack", "spc", "special", "spd",
	"spdef", "specialdefense", "spe", "speed", "bst", "basestattotal", "ht", "height", "weight", "wt", "gen", "g"];

class DittosWhoAmI extends ScriptedGame {
	canLateJoin: boolean = true;
	colors: string[] = [];
	dittoRound: number = 0;
	eggGroups: string[] = [];
	finalRound: boolean = false;
	includedPokemon: string[] = [];
	maxDittoRounds: number = 20;
	nextRoundFinal: boolean = false;
	playerInactiveRoundLimit = 2;
	playerOrder: Player[] = [];
	points = new Map<Player, number>();
	pokemonList: IPokemon[] = [];
	playerGuesses = new Map<Player, IPreviousGuess[]>();
	playerPokemon = new Map<Player, IPokemon>();
	playerWeaknesses = new Map<Player, string[]>();
	playerResistances = new Map<Player, string[]>();
	roundTime: number = 30 * 1000;
	solo: boolean = false;
	tiers: string[] = [];

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (lateJoin) {
			if (!this.pokemonList.length) return false;

			if (this.playerOrder.length) this.playerOrder.push(player);
			this.givePokemon(player, this.pokemonList[0]);
			this.pokemonList.shift();
		}

		return true;
	}

	async onStart(): Promise<void> { // eslint-disable-line @typescript-eslint/require-await
		this.pokemonList = this.shuffle(Games.getPokemonList({filter: x => {
			const color = Tools.toId(x.color);
			if (!this.colors.includes(color)) this.colors.push(color);

			const tier = Tools.toId(x.tier);
			if (!this.tiers.includes(tier)) this.tiers.push(tier);

			for (const group of x.eggGroups) {
				const id = Tools.toId(group);
				if (!this.eggGroups.includes(id)) this.eggGroups.push(id);
			}

			if (x.forme && !(x.forme === 'Mega' || x.forme === 'Totem' || x.forme === 'Gmax' || x.forme === 'Alola' ||
				x.forme === 'Galar' || x.forme === 'Hisui' || x.forme === 'Paldea')) return false;
			return true;
		}}));

		this.includedPokemon = this.pokemonList.map(x => x.name);

		for (const id in this.players) {
			this.givePokemon(this.players[id], this.pokemonList[0]);
			this.pokemonList.shift();
		}

		const text = "Each round, you must guess a parameter with ``" + Config.commandCharacter + "g [parameter]``. If you believe you " +
			"know what Pokemon you are, you may guess that instead with ``" + Config.commandCharacter + "g [Pokemon]``!";
		this.on(text, () => {
			this.setTimeout(() => void this.nextRound(), 5 * 1000);
		});
		this.say(text);
	}

	givePokemon(player: Player, pokemon: IPokemon): void {
		this.playerPokemon.set(player, pokemon);
		this.playerGuesses.set(player, []);

		const resistances: string[] = [];
		const weaknesses: string[] = [];
		for (const key of Dex.getTypeKeys()) {
			const type = Dex.getExistingType(key);
			if (Dex.isImmune(type.name, pokemon.types)) {
				resistances.push(type.name);
			} else {
				const effectiveness = Dex.getEffectiveness(type.name, pokemon.types);
				if (effectiveness <= -1) {
					resistances.push(type.name);
				} else if (effectiveness >= 1) {
					weaknesses.push(type.name);
				}
			}
		}

		this.playerResistances.set(player, resistances);
		this.playerWeaknesses.set(player, weaknesses);
	}

	checkTierAlias(input: string): string{
		if (input === "anythinggoes") return "ag";
		if (input === "ubers") return "uber";
		if (input === "overused") return "ou";
		if (input === "underused") return "uu";
		if (input === "underusedbanlist") return "uubl";
		if (input === "rarelyused") return "ru";
		if (input === "rarelusedbanlist") return "rubl";
		if (input === "neverused") return "nu";
		if (input === "neverusedbanlist") return "nubl";
		if (input === "pubanlist") return "publ";
		if (input === "zeroused") return "zu";
		if (input === "littlecup") return "lc";

		return input;
	}

	checkAnswerNegation(correct: boolean, negation: boolean): boolean {
		if (negation) return !correct;
		return correct;
	}

	checkGuess(guess: string, player: Player): boolean | string {
		const playerPokemon = this.playerPokemon.get(player)!;

		const negation = guess.charAt(0) === "!";
		if (negation) {
			guess = guess.slice(1);
		}

		const pokemon = Dex.getPokemon(guess);
		if (pokemon) {
			if (!this.includedPokemon.includes(pokemon.name)) {
				return pokemon.name + " cannot be assigned in this game.";
			}

			if (pokemon.name === playerPokemon.name) {
				this.points.set(this.currentPlayer!, 1);

				if (this.solo) {
					this.say("**Correct!**");
					this.end();
				} else {
					this.say("**Correct!**" + (this.playerOrder.length && !this.finalRound && !this.nextRoundFinal ?
						" The next round will be the final one!" : ""));
					if (!this.nextRoundFinal) {
						this.nextRoundFinal = true;
						this.maxDittoRounds++;
					}
				}
			} else {
				this.say("**Incorrect!** You were " + playerPokemon.name + ". " + this.currentPlayer!.name + " has been " +
					"eliminated from the game!");
				this.eliminatePlayer(this.currentPlayer!);
			}

			return true;
		} else if (this.finalRound) {
			return "This is the final round so you must guess your assigned Pokemon.";
		}

		let correctGuess: boolean | undefined;
		const move = Dex.getMove(guess);
		if (move) {
			correctGuess = false;
			for (const possibleMove of Dex.getAllPossibleMoves(playerPokemon)) {
				if (move.id === possibleMove) {
					correctGuess = true;
				}
			}

			return this.checkAnswerNegation(correctGuess, negation);
		}

		const ability = Dex.getAbility(guess);
		if (ability) {
			correctGuess = false;
			for (const i in playerPokemon.abilities) {
				// @ts-expect-error
				if (playerPokemon.abilities[i] === ability.name) {
					correctGuess = true;
				}
			}

			return this.checkAnswerNegation(correctGuess, negation);
		}

		const id = Tools.toId(guess);
		let type = Dex.getType(guess);
		if (!type && id.endsWith('type')) type = Dex.getType(id.substr(0, id.length - 4));
		if (type) {
			correctGuess = false;
			for (const name of playerPokemon.types) {
				if (name === type.name) {
					correctGuess = true;
				}
			}

			return this.checkAnswerNegation(correctGuess, negation);
		}

		const tier = this.checkTierAlias(id);
		const eggGroupAlias = id.endsWith('group') ? id.substr(0, id.length - 5) : id + 'group';
		if (this.colors.includes(id)) {
			correctGuess = Tools.toId(playerPokemon.color) === id;
		} else if (this.tiers.includes(tier)) {
			correctGuess = Tools.toId(playerPokemon.tier) === tier;
		} else if (this.eggGroups.includes(id) || this.eggGroups.includes(eggGroupAlias)) {
			correctGuess = false;

			for (const group of playerPokemon.eggGroups) {
				const groupId = Tools.toId(group);
				if (groupId === id || groupId === eggGroupAlias) {
					correctGuess = true;
					break;
				}
			}
		} else if (id === "mono" || id === "monotype") {
			correctGuess = playerPokemon.types.length === 1;
		} else if (id === "forme" || id === "form") {
			correctGuess = playerPokemon.forme ? true : false;
		} else if (id === "fe" || id === "fullyevolved") {
			correctGuess = !playerPokemon.evos.length;
		} else if (id === "mega" || id === "megax" || id === "megay") {
			correctGuess = playerPokemon.forme.startsWith("Mega");
		} else if (id === "alola" || id === "alolan") {
			correctGuess = playerPokemon.forme.startsWith("Alola");
		} else if (id === "galar" || id === "galarian") {
			correctGuess = playerPokemon.forme.startsWith("Galar");
		} else if (id === "hisui" || id === "hisuian") {
			correctGuess = playerPokemon.forme.startsWith("Hisui");
		} else if (id === "paldea" || id === "paldean") {
			correctGuess = playerPokemon.forme.startsWith("Paldea");
		} else if (id === "totem") {
			correctGuess = playerPokemon.forme.includes("Totem");
		} else if (id === "gmax" || id === "gigantamax") {
			correctGuess = playerPokemon.forme.includes("Gmax");
		} else if (((id.startsWith('gen') && id.length <= 5) || (id.startsWith('g') && id.length <= 3)) && !guess.includes('>') &&
			!guess.includes('<')) {
			const gen = id.startsWith('gen') ? parseInt(id.slice(3)) : parseInt(id.slice(1));
			if (isNaN(gen) || gen < 1 || gen > Dex.getGen()) {
				return "You must specify a valid gen.";
			}

			correctGuess = playerPokemon.gen === gen;
		}

		if (correctGuess !== undefined) {
			return this.checkAnswerNegation(correctGuess, negation);
		}

		let checkWeaknesses = false;
		let weaknessType: ITypeData | undefined;
		if (id.startsWith('weakto')) {
			checkWeaknesses = true;
			weaknessType = Dex.getType(id.slice(6));
		} else if (id.startsWith('weak')) {
			checkWeaknesses = true;
			weaknessType = Dex.getType(id.slice(4));
		}

		if (checkWeaknesses) {
			if (!weaknessType) {
				return "You must specify a valid type to check weakness against.";
			}

			const weaknesses = this.playerWeaknesses.get(player)!;
			return this.checkAnswerNegation(weaknesses.includes(weaknessType.name), negation);
		}

		let checkResistances = false;
		let resistanceType: ITypeData | undefined;
		if (id.startsWith('resists')) {
			checkResistances = true;
			resistanceType = Dex.getType(id.slice(7));
		} else if (id.startsWith('resist')) {
			checkResistances = true;
			resistanceType = Dex.getType(id.slice(6));
		}

		if (checkResistances) {
			if (!resistanceType) {
				return "You must specify a valid type to check resistance against.";
			}

			const resistances = this.playerResistances.get(player)!;
			return this.checkAnswerNegation(resistances.includes(resistanceType.name), negation);
		}

		let statName = "";
		let statValue = -1;
		let lessThanIndex: number | undefined;
		let greaterThanIndex: number | undefined;
		let equalIndex: number | undefined;
		for (let i = 1; i < guess.length; i++) {
			let validIndex = false;
			let orEqualTo = false;

			if (guess[i] === '<') {
				if (lessThanIndex !== undefined) {
					return "You may only include one '<'.";
				}

				lessThanIndex = i;
				if (guess[i + 1] === '=') {
					equalIndex = i + 1;
					orEqualTo = true;
				}
				validIndex = true;
			} else if (guess[i] === '>') {
				if (greaterThanIndex !== undefined) {
					return "You may only include one '>'.";
				}

				greaterThanIndex = i;
				if (guess[i + 1] === '=') {
					equalIndex = i + 1;
					orEqualTo = true;
				}
				validIndex = true;
			} else if (guess[i] === '=') {
				if (equalIndex !== undefined) {
					return "You may only include one '='.";
				}

				equalIndex = i;
				validIndex = true;
			}

			if (validIndex) {
				statName = Tools.toId(guess.substr(0, i));
				if (orEqualTo) i++;
				statValue = parseFloat(guess.slice(i + 1).trim());
			}
		}

		if (statName) {
			if (!USABLE_STATS.includes(statName)) {
				return "You must specify a valid stat name.";
			}

			if (isNaN(statValue) || statValue < 0) {
				return "You must specify a valid stat value.";
			}

			let pokemonStat = 0;
			if (statName === "hp" || statName === "hitpoints") {
				pokemonStat = playerPokemon.baseStats.hp;
			} else if (statName === "atk" || statName === "attack") {
				pokemonStat = playerPokemon.baseStats.atk;
			} else if (statName === "def" || statName === "defense") {
				pokemonStat = playerPokemon.baseStats.def;
			} else if (statName === "spa" || statName === "spatk" || statName === "specialattack") {
				pokemonStat = playerPokemon.baseStats.spa;
			} else if (statName === "spd" || statName === "spdef" || statName === "specialdefense") {
				pokemonStat = playerPokemon.baseStats.spd;
			} else if (statName === "spe" || statName === "speed") {
				pokemonStat = playerPokemon.baseStats.spe;
			} else if (statName === "bst" || statName === "basestattotal") {
				pokemonStat = playerPokemon.bst;
			} else if (statName === "ht" || statName === "height") {
				pokemonStat = playerPokemon.heightm;
			} else if (statName === "wt" || statName === "weight") {
				pokemonStat = playerPokemon.weightkg;
			} else if (statName === "gen" || statName === "g") {
				pokemonStat = playerPokemon.gen;
			}

			let correctStat = false;
			if (equalIndex) correctStat = pokemonStat === statValue;
			if (greaterThanIndex) correctStat = correctStat || pokemonStat > statValue;
			if (lessThanIndex) correctStat = correctStat || pokemonStat < statValue;

			return this.checkAnswerNegation(correctStat, negation);
		}

		return "You must ask a question about moves, abilities, types, egg groups, color, formes, evolution stage, gen, " +
			"weaknesses, resistances, or stats.";
	}

	async onNextRound(): Promise<void> {
		if (this.currentPlayer) {
			if (this.incrementPlayerInactiveRound(this.currentPlayer)) {
				this.say(this.currentPlayer.name + " did not guess a parameter or their Pokemon and has been eliminated from the game!");
				this.currentPlayer.say("Your Pokemon was **" + this.playerPokemon.get(this.currentPlayer)!.name + "**!");
				this.eliminatePlayer(this.currentPlayer);
			}

			this.currentPlayer = null;
		}

		if (!this.playerOrder.length) {
			this.dittoRound++;
			if (this.dittoRound > this.maxDittoRounds) {
				this.say("Time is up!");
				this.end();
				return;
			}

			const remainingPlayers: Player[] = [];
			for (const id in this.players) {
				if (this.players[id].eliminated || this.points.get(this.players[id])) continue;
				remainingPlayers.push(this.players[id]);
			}

			if (!remainingPlayers.length) {
				this.end();
				return;
			}

			this.playerOrder = this.shufflePlayers(remainingPlayers);

			const uhtmlName = this.uhtmlBaseName + '-round';
			const html = this.getRoundHtml(players => this.getPlayerNames(players), this.getRemainingPlayers(this.playerOrder),
				"Round " + this.dittoRound);
			this.onUhtml(uhtmlName, html, () => {
				this.setTimeout(() => void this.nextRound(), 5 * 1000);
			});
			this.sayUhtml(uhtmlName, html);

			if (this.nextRoundFinal || this.dittoRound === this.maxDittoRounds) {
				this.finalRound = true;
				this.say("**This is the final round**! You must use ``" + Config.commandCharacter + "g [Pokemon]`` now to " +
					"guess your assigned Pokemon.");
			}

			return;
		}

		let currentPlayer = this.playerOrder[0];
		this.playerOrder.shift();
		while (currentPlayer.eliminated && this.playerOrder.length) {
			currentPlayer = this.playerOrder[0];
			this.playerOrder.shift();
		}

		if (currentPlayer.eliminated) {
			await this.nextRound();
			return;
		}

		const text = "**" + currentPlayer.name + "** you are up!";
		this.on(text, () => {
			this.currentPlayer = currentPlayer;

			const previousGuesses = this.playerGuesses.get(currentPlayer)!;
			if (previousGuesses.length) {
				let html = "<b>Your previous guesses</b>:<br /><br />";
				const guessesHtml: string[] = [];
				for (const previousGuess of previousGuesses) {
					guessesHtml.push("<code>" + Tools.escapeHTML(previousGuess.parameters) + "</code> -> <b>" +
						(previousGuess.correct ? "Yes" : "No") + "</b>");
				}
				html += guessesHtml.join(", ");

				currentPlayer.sayPrivateUhtml(html, this.actionsUhtmlName);
			}

			this.setTimeout(() => void this.nextRound(), this.roundTime);
		});
		this.say(text);
	}

	onEnd(): void {
		for (const id in this.players) {
			if (this.players[id].eliminated) continue;
			const player = this.players[id];
			const points = this.points.get(player);
			if (points) {
				this.winners.set(player, points);
				this.addBits(player, 500);
			}
		}

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.playerGuesses.clear();
		this.playerPokemon.clear();
		this.playerWeaknesses.clear();
		this.playerResistances.clear();
	}
}

const commands: GameCommandDefinitions<DittosWhoAmI> = {
	guess: {
		command(target, room, user) {
			if (this.players[user.id] !== this.currentPlayer) return false;

			if (!Tools.toId(target)) {
				this.say("You must include a parameter or Pokemon.");
				return false;
			}

			const player = this.players[user.id];
			const questions = target.split("|");
			if (questions.length > MAX_ROUND_PARAMETERS) {
				this.say("You can only include up to " + MAX_ROUND_PARAMETERS + " parameters per round.");
				return false;
			}

			if (Dex.getPokemon(questions[0]) && questions.length > 1) {
				this.say("You can only guess 1 Pokemon.");
				return false;
			}

			let atLeastOneCorrect = false;
			const formattedQuestions: string[] = [];
			for (const question of questions) {
				const trimmed = question.trim();
				if (!trimmed) continue;

				formattedQuestions.push(trimmed.toLowerCase());

				const result = this.checkGuess(trimmed, player);
				// solo variant ends in checkGuess()
				if (this.ended) return true;

				if (typeof result === 'string') {
					this.say(result);
					return false;
				}

				if (result) atLeastOneCorrect = true;
			}

			const formattedGuess = formattedQuestions.slice().sort().join("|");
			const previousGuesses = this.playerGuesses.get(player)!;
			for (const previousGuess of previousGuesses) {
				if (previousGuess.parameters === formattedGuess) {
					this.say("You have already guessed " + (formattedQuestions.length > 1 ? "those parameters" : "that parameter") + "!");
					return false;
				}
			}

			previousGuesses.push({parameters: formattedGuess, correct: atLeastOneCorrect});

			this.currentPlayer = null;
			if (!player.eliminated && !this.points.get(player)) {
				if (atLeastOneCorrect) {
					this.say("**Yes!**");
				} else {
					this.say("**No!**");
				}
			}

			this.setTimeout(() => void this.nextRound(), 3 * 1000);

			return true;
		},
		aliases: ['g'],
	},
};

export const game: IGameFile<DittosWhoAmI> = {
	aliases: ["dittos", "who am i"],
	category: 'puzzle',
	class: DittosWhoAmI,
	commands,
	commandDescriptions: [Config.commandCharacter + 'g [parameter]', Config.commandCharacter + 'g [Pokemon]'],
	description: "At the start of the game, all players are assigned a different Pokemon. Each round, players must ask " +
				"'Yes' or 'No' questions to guess which Pokemon they were assigned. Once a player guesses correctly, " +
				"there will be one final round for all remaining players!",
	name: "Ditto's Who Am I",
	mascot: "Ditto",
	variants: [
		{
			name: "Ditto's Solo Who Am I",
			description: "At the start of the game, all players are assigned a different Pokemon. Each round, players must ask 'Yes'" +
				" or 'No' questions to guess which Pokemon they were assigned. The first player to guess correctly wins!",
			challengeSettings: {
				onevsone: {
					enabled: true,
				},
			},
			solo: true,
			variantAliases: ["solo"],
		},
	],
};
