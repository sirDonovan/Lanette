import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import { Game } from '../room-game';
import type { User } from "../users";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

interface IPokemonData {
	type: readonly string[];
	color: string[];
	moves: string[];
	generation: string[]
}
type IPokemonCategory = keyof IPokemonData;

const data: {pokemon: Dict<IPokemonData>, keys: string[], usableMoves: string[], allParameters: KeyedDict<IPokemonCategory, string[]>}= {
	pokemon: {},
	keys: [],
	usableMoves: [],
	allParameters: {
		color: [],
		generation: [],
		moves: [],
		type: [],
	},
};

const categories: IPokemonCategory[] = ['type', 'color', 'moves', 'generation'];
const typeAliases: Dict<string> = {};

const minimumMoveAvailability = 30;
const maximumMoveAvailability = 500;

class SpindasExcludedPokemon extends Game {
	currentPlayer: Player | null = null;
	excludedRound: number = 0;
	firstSpecies: string = '';
	guessedPokemon: string[] = [];
	parameter: string = '';
	playerOrder: Player[] = [];

	// set in onStart()
	category!: IPokemonCategory;

	static loadData(room: Room | User): void {
		for (const key of Dex.data.typeKeys) {
			const type = Dex.getExistingType(key);
			typeAliases[type.id + 'type'] = type.name;
		}

		const pokemonList = Games.getPokemonList();
		const moves = Games.getMovesList(x => !x.id.includes('hiddenpower'));
		for (const move of moves) {
			const availability = Dex.getMoveAvailability(move, pokemonList);
			if (!availability || availability < minimumMoveAvailability || availability > maximumMoveAvailability) continue;
			data.usableMoves.push(move.id);
		}

		for (const pokemon of pokemonList) {
			const allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
			const usableMoves: string[] = [];
			for (const move of allPossibleMoves) {
				if (data.usableMoves.includes(move)) usableMoves.push(Dex.getExistingMove(move).name);
			}
			if (!usableMoves.length) continue;

			for (const type of pokemon.types) {
				const typeId = Tools.toId(type);
				if (!data.allParameters.type.includes(typeId)) data.allParameters.type.push(typeId);
			}

			const colorId = Tools.toId(pokemon.color);
			if (!data.allParameters.color.includes(colorId)) data.allParameters.color.push(colorId);

			const generation = "Gen " + pokemon.gen;
			const generationId = Tools.toId(generation);
			if (!data.allParameters.generation.includes(generationId)) data.allParameters.generation.push(generationId);

			data.pokemon[pokemon.name] = {
				type: pokemon.types,
				color: [pokemon.color],
				moves: usableMoves,
				generation: [generation],
			};
			data.keys.push(pokemon.name);
		}
	}

	onStart(): void {
		const text = "Each round, either try to exclude a Pokemon with ``" + Config.commandCharacter + "exclude [Pokemon]`` or guess " +
			"the parameter with ``" + Config.commandCharacter + "g [parameter]``!";

		this.on(text, () => {
			this.timeout = setTimeout(() => {
				const species = this.sampleOne(data.keys);
				this.firstSpecies = species;
				this.category = this.sampleOne(categories);
				this.parameter = this.sampleOne(data.pokemon[species][this.category]);

				this.nextRound();
			}, 5 * 1000);
		});

		this.say(text);
	}

	onNextRound(): void {
		if (this.currentPlayer) {
			this.say(this.currentPlayer.name + " did not exclude a Pokemon or guess the parameter and has been eliminated from the game!");
			this.eliminatePlayer(this.currentPlayer, "You did not exclude a Pokemon or guess the parameter!");
			this.currentPlayer = null;
		}

		if (!this.playerOrder.length || !this.getRemainingPlayerCount(this.playerOrder)) {
			if (this.getRemainingPlayerCount() < 2) {
				this.say("The parameter was: __" + this.parameter + "__!");
				this.end();
				return;
			}
			this.excludedRound++;
			this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(this.getPlayerNames, null, "Round " + this.excludedRound));
			this.playerOrder = this.shufflePlayers();
			if (this.excludedRound === 1) this.say("A randomly chosen Pokemon that fits the parameter is **" + this.firstSpecies + "**!");
		}

		const currentPlayer = this.playerOrder[0];
		this.playerOrder.shift();
		if (currentPlayer.eliminated) return this.onNextRound();

		const text = "**" + currentPlayer.name + "** you are up!";
		this.on(text, () => {
			this.currentPlayer = currentPlayer;
			this.timeout = setTimeout(() => this.nextRound(), 30 * 1000);
		});
		this.say(text);
	}

	onEnd(): void {
		for (const id in this.players) {
			if (this.players[id].eliminated) continue;
			this.winners.set(this.players[id], 1);
			this.addBits(this.players[id], 500);
		}
		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<SpindasExcludedPokemon> = {
	exclude: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (this.players[user.id] !== this.currentPlayer) return false;
			const player = this.players[user.id];
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) {
				this.say(CommandParser.getErrorText(['invalidPokemon', target]));
				return false;
			}
			if (!(pokemon.name in data.pokemon)) {
				this.say(pokemon.name + " is not in this game! Please choose another Pokemon.");
				return false;
			}

			if (this.guessedPokemon.includes(pokemon.name)) {
				this.say(pokemon.name + " has already been guessed! Please choose another Pokemon.");
				return false;
			}

			this.guessedPokemon.push(pokemon.name);
			if (!data.pokemon[pokemon.name][this.category].includes(this.parameter)) {
				this.say(pokemon.name + " is **not** excluded!");
			} else {
				this.say(pokemon.name + " **is** excluded! " + player.name + " has been eliminated.");
				this.eliminatePlayer(player, "You guessed a Pokemon that is excluded by the parameter.");
			}

			this.currentPlayer = null;
			this.nextRound();
			return true;
		},
	},
	guess: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (this.players[user.id] !== this.currentPlayer) return false;
			const player = this.players[user.id];

			let id = Tools.toId(target);
			if (!isNaN(parseInt(id))) id = "gen" + id;
			if (id in typeAliases) id = Tools.toId(typeAliases[id]);

			let validParam = false;
			if (data.usableMoves.includes(id)) {
				validParam = true;
			} else {
				for (const category of categories) {
					if (data.allParameters[category].includes(id)) {
						validParam = true;
						break;
					}
				}
			}

			if (!validParam) {
				player.say("'" + target.trim() + "' is not a valid parameter.");
				return false;
			}

			if (id === Tools.toId(this.parameter)) {
				this.say(player.name + " correctly guessed the parameter (__" + this.parameter + "__)!");
				if (this.timeout) clearTimeout(this.timeout);
				for (const id in this.players) {
					if (this.players[id] !== player) this.players[id].eliminated = true;
				}
				this.end();
			} else {
				this.say(user.name + " guessed an incorrect parameter and has been eliminated from the game!");
				this.eliminatePlayer(this.currentPlayer, "You guessed an incorrect parameter!");
				this.currentPlayer = null;
				this.nextRound();
			}

			return true;
		},
		aliases: ['g'],
	},
};

export const game: IGameFile<SpindasExcludedPokemon> = {
	aliases: ["sep", "spindas"],
	class: SpindasExcludedPokemon,
	commands,
	commandDescriptions: [Config.commandCharacter + 'exclude [Pokemon]', Config.commandCharacter + 'g [parameter]'],
	description: "Players try to guess Pokemon that are not excluded by the randomly chosen parameter!",
	formerNames: ["Excluded"],
	name: "Spinda's Excluded Pokemon",
	mascot: "Spinda",
};
