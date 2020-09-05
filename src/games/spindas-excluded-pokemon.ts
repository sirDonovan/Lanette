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

const categories: IPokemonCategory[] = ['type', 'color', 'moves', 'moves', 'generation'];
const typeAliases: Dict<string> = {};

const basePoints = 3;
const minimumMoveAvailability = 30;
const maximumMoveAvailability = 500;

class SpindasExcludedPokemon extends Game {
	currentPlayer: Player | null = null;
	excludedHint: string = '';
	excludedRound: number = 0;
	guessedPokemon: string[] = [];
	parameter: string = '';
	playerOrder: Player[] = [];
	points = new Map<Player, number>();
	roundPlayerOrder: Player[] = [];

	// set before the first round
	category!: IPokemonCategory;

	static loadData(room: Room | User): void {
		for (const key of Dex.data.typeKeys) {
			const type = Dex.getExistingType(key);
			typeAliases[type.id + 'type'] = type.name;
		}

		const moves = Games.getMovesList(x => !x.id.includes('hiddenpower'));
		for (const move of moves) {
			const availability = Dex.getMoveAvailability(move);
			if (!availability || availability < minimumMoveAvailability || availability > maximumMoveAvailability) continue;
			data.usableMoves.push(move.id);
		}

		const pokemonList = Games.getPokemonList();
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
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		});

		this.say(text);
	}

	setParameter(): void {
		const species = this.shuffle(data.keys)[0];
		this.category = this.sampleOne(categories);
		this.parameter = this.sampleOne(data.pokemon[species][this.category]);
		this.excludedHint = species;
	}

	onNextRound(): void {
		if (this.currentPlayer) {
			this.say(this.currentPlayer.name + " did not exclude a Pokemon or guess the parameter and has been eliminated from the game!");
			this.eliminatePlayer(this.currentPlayer, "You did not exclude a Pokemon or guess the parameter!");
			this.currentPlayer = null;
		}

		if (!this.parameter) {
			for (const i in this.players) {
				this.players[i].frozen = false;
			}
			if (this.getRemainingPlayerCount() < 2) {
				this.end();
				return;
			}

			this.guessedPokemon = [];
			this.roundPlayerOrder = this.shufflePlayers();
			this.playerOrder = this.roundPlayerOrder.slice();
			this.excludedRound++;
			this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(this.getPlayerPoints, null, "Round " +
				this.excludedRound));
			this.setParameter();
			this.say("A randomly chosen Pokemon that **is** excluded is **" + this.excludedHint + "**!");
		}

		if (!this.playerOrder.length) {
			if (this.getRemainingPlayerCount() < 2) {
				this.say("The parameter was __" + this.parameter + "__.");
				this.parameter = '';
				this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
				return;
			}

			this.playerOrder = this.roundPlayerOrder.filter(x => !x.frozen);
		}

		const currentPlayer = this.playerOrder[0];
		this.playerOrder.shift();
		if (currentPlayer.eliminated || currentPlayer.frozen) return this.onNextRound();

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
			const player = this.players[id];
			const points = this.points.get(player);
			if (points === this.format.options.points) {
				this.winners.set(player, 1);
				this.addBits(player, 500);
			} else if (points) {
				this.addBits(player, 100 * points);
			}
		}

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<SpindasExcludedPokemon> = {
	exclude: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.parameter || this.players[user.id] !== this.currentPlayer) return false;
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
				this.say(pokemon.name + " has already been used! Please choose another Pokemon.");
				return false;
			}

			this.guessedPokemon.push(pokemon.name);
			if (!data.pokemon[pokemon.name][this.category].includes(this.parameter)) {
				this.say(pokemon.name + " is **not** excluded!");
			} else {
				this.say(pokemon.name + " **is** excluded! " + player.name + " can no longer guess this round.");
				player.frozen = true;
			}

			this.currentPlayer = null;
			this.nextRound();
			return true;
		},
	},
	guess: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.parameter || this.players[user.id] !== this.currentPlayer) return false;
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

			if (this.timeout) clearTimeout(this.timeout);
			this.currentPlayer = null;

			if (id === Tools.toId(this.parameter)) {
				let points = this.points.get(player) || 0;
				points++;
				this.points.set(player, points);

				if (points === this.format.options.points) {
					this.say(player.name + " wins the game! The final parameter was __" + this.parameter + "__.");
					this.end();
				} else {
					this.say(player.name + " advances to **" + points +"** point" + (points > 1 ? "s" : "") + "! The parameter was __" +
						this.parameter + "__.");
					this.parameter = '';
					this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
				}
			} else {
				this.say("Incorrect! " + player.name + " can no longer guess this round.");
				player.frozen = true;
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
	customizableOptions: {
		points: {min: basePoints, base: basePoints, max: basePoints},
	},
	description: "Players try to guess Pokemon that are not excluded by the randomly chosen parameter!",
	formerNames: ["Excluded"],
	name: "Spinda's Excluded Pokemon",
	mascot: "Spinda",
};
