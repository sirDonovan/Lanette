import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

interface IPokemonData {
	color: string[];
	eggGroup: string[];
	generation: string[];
	moves: string[];
	type: readonly string[];
}
type IPokemonCategory = keyof IPokemonData;

const data: {pokemon: Dict<IPokemonData>, keys: string[], allParameters: KeyedDict<IPokemonCategory, string[]>} = {
	pokemon: {},
	keys: [],
	allParameters: {
		color: [],
		eggGroup: [],
		generation: [],
		moves: [],
		type: [],
	},
};

const categories: IPokemonCategory[] = ['color', 'eggGroup', 'generation', 'moves', 'type'];
const generationPrefix = "Gen ";
const eggGroupSuffix = " Group";
const typeSuffix = " Type";

const basePoints = 3;
const minimumMoveAvailability = 30;
const maximumMoveAvailability = 500;

class SpindasExcludedPokemon extends ScriptedGame {
	canLateJoin = true;
	excludedHint: string = '';
	excludedRound: number = 0;
	guessedPokemon: string[] = [];
	lastParameter: string = '';
	parameter: string = '';
	playerInactiveRoundLimit = 2;
	playerOrder: Player[] = [];
	points = new Map<Player, number>();
	roundPlayerOrder: Player[] = [];

	moveOnly?: boolean;

	// set before the first round
	category!: IPokemonCategory;

	static loadData(): void {
		const includedMoves: string[] = [];
		for (const move of Games.getMovesList()) {
			if (move.id.startsWith('hiddenpower')) continue;

			const availability = Dex.getMoveAvailability(move);
			if (!availability || availability < minimumMoveAvailability || availability > maximumMoveAvailability) continue;
			includedMoves.push(move.id);
		}

		for (const pokemon of Games.getPokemonList()) {
			const allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
			const usableMoves: string[] = [];
			for (const move of allPossibleMoves) {
				if (includedMoves.includes(move)) {
					if (!data.allParameters.moves.includes(move)) data.allParameters.moves.push(move);
					usableMoves.push(Dex.getExistingMove(move).name);
				}
			}
			if (!usableMoves.length) continue;

			const colorId = Tools.toId(pokemon.color);
			if (!data.allParameters.color.includes(colorId)) data.allParameters.color.push(colorId);

			const generations: string[] = [];
			const generationParameters: string[] = ["" + pokemon.gen, generationPrefix + pokemon.gen];
			for (const generation of generationParameters) {
				const generationId = Tools.toId(generation);
				if (!data.allParameters.generation.includes(generationId)) data.allParameters.generation.push(generationId);
				generations.push(generation);
			}

			const eggGroups: string[] = [];
			for (const name of pokemon.eggGroups) {
				const eggGroupParameters: string[] = [name, name + eggGroupSuffix];
				for (const eggGroup of eggGroupParameters) {
					const eggGroupId = Tools.toId(eggGroup);
					if (!data.allParameters.eggGroup.includes(eggGroupId)) data.allParameters.eggGroup.push(eggGroupId);
					eggGroups.push(eggGroup);
				}
			}

			const types: string[] = [];
			for (const name of pokemon.types) {
				const typeParameters: string[] = [name, name + typeSuffix];
				for (const type of typeParameters) {
					const typeId = Tools.toId(type);
					if (!data.allParameters.type.includes(typeId)) data.allParameters.type.push(typeId);
					types.push(type);
				}
			}

			data.pokemon[pokemon.name] = {
				color: [pokemon.color],
				eggGroup: eggGroups,
				generation: generations,
				moves: usableMoves,
				type: types,
			};
			data.keys.push(pokemon.name);
		}
	}

	onAddPlayer(player: Player, latejoin?: boolean): boolean {
		if (latejoin) {
			this.roundPlayerOrder.push(player);
			this.playerOrder.push(player);
		}

		return true;
	}

	onStart(): void {
		const text = "Each round, either try to exclude a Pokemon with ``" + Config.commandCharacter + "exclude [Pokemon]`` or guess " +
			"the parameter with ``" + Config.commandCharacter + "g [parameter]``!";

		this.on(text, () => {
			this.setTimeout(() => this.nextRound(), 5 * 1000);
		});

		this.say(text);
	}

	setParameter(): void {
		if (this.moveOnly) {
			this.category = 'moves';
		} else {
			this.category = this.sampleOne(categories);
			if (this.category !== 'moves' && !this.random(categories.length)) this.category = 'moves';
		}

		const shuffledKeys = this.shuffle(data.keys);
		let species = shuffledKeys[0];
		shuffledKeys.shift();
		while (data.pokemon[species][this.category].length === 1 && data.pokemon[species][this.category][0] === this.lastParameter) {
			if (!shuffledKeys.length) {
				return this.setParameter();
			}

			species = shuffledKeys[0];
			shuffledKeys.shift();
		}
		this.excludedHint = species;

		let parameter = this.sampleOne(data.pokemon[species][this.category]);
		while (parameter === this.lastParameter) {
			parameter = this.sampleOne(data.pokemon[species][this.category]);
		}

		if (this.category === 'generation') {
			if (!parameter.startsWith(generationPrefix)) parameter = generationPrefix + parameter;
		} else if (this.category === 'eggGroup') {
			if (!parameter.endsWith(eggGroupSuffix)) parameter += eggGroupSuffix;
		} else if (this.category === 'type') {
			if (!parameter.endsWith(typeSuffix)) parameter += typeSuffix;
		}

		this.parameter = parameter;
	}

	getDisplayedRoundNumber(): number {
		return this.excludedRound;
	}

	onNextRound(): void {
		if (this.currentPlayer) {
			if (this.addPlayerInactiveRound(this.currentPlayer)) {
				this.say(this.currentPlayer.name + " did not exclude a Pokemon or guess the parameter and has been eliminated from " +
					"the game!");
				this.eliminatePlayer(this.currentPlayer);
			} else {
				this.say(this.currentPlayer.name + " did not exclude a Pokemon or guess the parameter and can no longer guess " +
					"this round.");
				this.currentPlayer.frozen = true;
			}
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
			this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(players => this.getPlayerPoints(players)));
			this.setParameter();
			this.say("A randomly chosen Pokemon that **is** excluded is **" + this.excludedHint + "**!");
		}

		if (!this.playerOrder.length) {
			if (this.getRemainingPlayerCount() < 2) {
				this.say("The parameter was __" + this.parameter + "__.");
				this.parameter = '';
				this.setTimeout(() => this.nextRound(), 5 * 1000);
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
			this.setTimeout(() => this.nextRound(), 30 * 1000);
		});
		this.say(text);
	}

	onEnd(): void {
		for (const id in this.players) {
			if (this.players[id].eliminated) continue;
			const player = this.players[id];
			const points = this.points.get(player);
			if (points === this.options.points!) {
				this.winners.set(player, points);
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
		command(target, room, user) {
			if (!this.parameter || this.players[user.id] !== this.currentPlayer) return false;
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
				this.say(pokemon.name + " **is** excluded!");
			}

			this.currentPlayer = null;
			this.nextRound();
			return true;
		},
	},
	guess: {
		command(target, room, user) {
			if (!this.parameter || this.players[user.id] !== this.currentPlayer) return false;
			const player = this.players[user.id];
			const id = Tools.toId(target);

			let validCategory = 0;
			if (this.moveOnly) {
				if (data.allParameters.moves.includes(id)) validCategory++;
			} else {
				for (const category of categories) {
					if (data.allParameters[category].includes(id)) {
						validCategory++;
					}
				}
			}

			if (!validCategory) {
				player.say("'" + target.trim() + "' is not a valid parameter.");
				return false;
			}
			if (validCategory > 1) {
				player.say("'" + target.trim() + "' is a parameter in multiple categories so you must use the full name.");
				return false;
			}

			if (this.timeout) clearTimeout(this.timeout);
			this.currentPlayer = null;

			const parameterId = Tools.toId(this.parameter);
			let match = id === parameterId;
			if (!match) {
				if (this.category === 'generation') {
					match = Tools.toId(generationPrefix + id) === parameterId;
				} else if (this.category === 'eggGroup') {
					match = Tools.toId(id + eggGroupSuffix) === parameterId;
				} else if (this.category === 'type') {
					match = Tools.toId(id + typeSuffix) === parameterId;
				}
			}

			if (match) {
				let points = this.points.get(player) || 0;
				points++;
				this.points.set(player, points);

				this.say(player.name + " advances to **" + points + "** point" + (points > 1 ? "s" : "") + "! The parameter was __" +
					this.parameter + "__.");
				if (points === this.options.points) {
					this.end();
					return true;
				} else {
					this.parameter = '';
					this.setTimeout(() => this.nextRound(), 5 * 1000);
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
	category: 'puzzle',
	class: SpindasExcludedPokemon,
	commands,
	commandDescriptions: [Config.commandCharacter + 'exclude [Pokemon]', Config.commandCharacter + 'g [parameter]'],
	customizableNumberOptions: {
		points: {min: basePoints, base: basePoints, max: basePoints},
	},
	description: "Players try to guess the randomly chosen parameters by excluding Pokemon each round!",
	formerNames: ["Excluded"],
	name: "Spinda's Excluded Pokemon",
	mascot: "Spinda",
	nonTrivialLoadData: true,
	variants: [
		{
			name: "Spinda's Move-Only Excluded Pokemon",
			description: "Players try to guess the randomly chosen moves by excluding Pokemon each round!",
			moveOnly: true,
			variantAliases: ['move', 'moves'],
		},
	],
};
