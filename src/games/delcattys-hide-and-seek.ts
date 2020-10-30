import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import { addPlayers, assert, runCommand } from "../test/test-tools";
import type { GameCommandDefinitions, GameFileTests, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";

const data: {'parameters': Dict<string[]>; 'pokemon': string[]} = {
	"parameters": {},
	"pokemon": [],
};

class DelcattysHideAndSeek extends ScriptedGame {
	canCharm: boolean = false;
	canSelect: boolean = false;
	categories: string[] = [];
	maxPlayers: number = 15;
	pokemonChoices = new Map<Player, string>();

	charmer!: Player;

	static loadData(): void {
		const parameters: Dict<IPokemon[]> = {};

		for (const pokemon of Games.getPokemonList()) {
			const params: string[] = [];
			for (const eggGroup of pokemon.eggGroups) {
				params.push(eggGroup + " Group");
			}

			for (const type of pokemon.types) {
				params.push(type + " Type");
			}
			params.push("Generation " + pokemon.gen);
			if (Games.isIncludedPokemonTier(pokemon.tier)) params.push(pokemon.tier);
			params.push(pokemon.color);

			for (const param of params) {
				if (!(param in parameters)) parameters[param] = [];
				parameters[param].push(pokemon);
			}
		}

		const parameterKeys = Object.keys(parameters);
		for (let i = 0, len = parameterKeys.length; i < len; i++) {
			for (let j = 0; j < len; j++) {
				if (i === j) continue;
				const paramA = parameterKeys[i];
				const paramB = parameterKeys[j];
				const parameter = paramA + ", " + paramB;
				const parameterList: IPokemon[] = [];
				data.parameters[parameter] = [];
				for (const pokemon of parameters[paramA]) {
					if (parameters[paramB].includes(pokemon)) {
						parameterList.push(pokemon);
					}
				}

				data.parameters[parameter] = parameterList
					.filter(x => !(x.forme && parameterList.includes(Dex.getExistingPokemon(x.baseSpecies))))
					.map(x => {
						if (!data.pokemon.includes(x.id)) data.pokemon.push(x.id);
						return x.id;
					});
			}
		}
	}

	onRemovePlayer(player: Player): void {
		if (player === this.charmer) {
			this.offCommands(['select']);
			this.nextRound();
		}
	}

	onStart(): void {
		this.nextRound();
	}

	onNextRound(): void {
		this.canSelect = false;

		const remainingPlayerCount = this.getRemainingPlayerCount();
		if (remainingPlayerCount < 2) return this.end();

		this.pokemonChoices.clear();
		this.charmer = this.getRandomPlayer();
		let requiredPokemon = remainingPlayerCount;
		if (requiredPokemon > 2) requiredPokemon += this.random(3) - 1;

		const param = this.sampleOne(Object.keys(data.parameters).filter(x => data.parameters[x].length === requiredPokemon));
		this.categories = param.split(", ");

		const otherPlayers: string[] = [];
		for (const i in this.players) {
			if (this.players[i].eliminated || this.charmer === this.players[i]) continue;
			otherPlayers.push(this.players[i].name);
		}

		const text = "**" + this.charmer.name + "** is the charmer! " + Tools.joinList(otherPlayers) + ", select a **" + param +
			"** Pokemon with ``" + Config.commandCharacter + "select [Pokemon]`` in PMs!";
		this.on(text, () => {
			this.canSelect = true;
			this.timeout = setTimeout(() => this.selectCharmedPokemon(), 60 * 1000);
		});
		this.onCommands(['select'], {max: this.getRemainingPlayerCount() - 1, remainingPlayersMax: true},
			() => this.selectCharmedPokemon());
		this.say(text);
	}

	selectCharmedPokemon(): void {
		if (this.timeout) clearTimeout(this.timeout);

		this.canSelect = false;
		for (const id in this.players) {
			if (this.players[id].eliminated || this.charmer === this.players[id]) continue;
			const player = this.players[id];
			if (!this.pokemonChoices.has(player)) {
				this.eliminatePlayer(player, "You did not select a Pokemon!");
			}
		}
		if (this.getRemainingPlayerCount() === 1) {
			this.say("No one chose a valid Pokemon!");
			this.end();
			return;
		}

		const text = this.charmer.name + " please select a **" + this.categories.join(", ") + "** Pokemon to charm with ``" +
			Config.commandCharacter + "charm [Pokemon]``!";
		this.on(text, () => {
			this.canCharm = true;
			this.timeout = setTimeout(() => {
				this.canCharm = false;
				this.say("**" + this.charmer.name + "** did not choose a Pokemon to charm!");
				this.eliminatePlayer(this.charmer, "You did not choose a Pokemon to charm!");
				this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			}, 60 * 1000);
		});
		this.say(text);
	}

	pokemonFitsParameters(pokemon: IPokemon): boolean {
		return data.parameters[this.categories.join(', ')].includes(pokemon.id);
	}

	onEnd(): void {
		const winner = this.getFinalPlayer();
		if (winner) {
			this.winners.set(winner, 1);
			this.addBits(winner, 500);
		}
		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<DelcattysHideAndSeek> = {
	charm: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (this.players[user.id] !== this.charmer || !this.canCharm) return false;
			const player = this.players[user.id];
			target = Tools.toId(target);
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) {
				player.say(CommandParser.getErrorText(['invalidPokemon', target]));
				return false;
			}
			if (!data.pokemon.includes(pokemon.id)) {
				player.say(pokemon.name + " cannot be used in this game.");
				return false;
			}
			if (!this.pokemonFitsParameters(pokemon)) {
				if (pokemon.forme && this.pokemonFitsParameters(Dex.getExistingPokemon(pokemon.baseSpecies))) {
					player.say("You must use " + pokemon.name + "'s base forme for the current parameters!");
				} else {
					player.say(pokemon.name + " does not follow the parameters!");
				}
				return false;
			}

			this.canCharm = false;

			const eliminatedPlayers: string[] = [];
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const otherPlayer = this.players[i];
				if (this.pokemonChoices.get(otherPlayer) === pokemon.name) {
					this.eliminatePlayer(otherPlayer, "Your Pokemon was charmed!");
					eliminatedPlayers.push(otherPlayer.name);
				}
			}
			if (!eliminatedPlayers.length) {
				this.say("**" + this.charmer.name + "** charmed **" + pokemon.name + "**! Unfortunately, they did not eliminate " +
					"anyone...");
				this.eliminatePlayer(this.charmer, "No one chose the Pokemon you charmed!");
			} else {
				this.say("**" + this.charmer.name + "** charmed **" + pokemon.name + "** and eliminated " +
					Tools.joinList(eliminatedPlayers) + " from the game!");
			}
			if (this.timeout) clearTimeout(this.timeout);
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			return true;
		},
		chatOnly: true,
	},
	select: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canSelect) return false;
			const player = this.players[user.id];
			if (player === this.charmer) {
				user.say("As the charmer, you cannot select a Pokemon.");
				return false;
			}
			if (this.pokemonChoices.has(player)) {
				user.say("You have already selected your Pokemon!");
				return false;
			}

			target = Tools.toId(target);
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) {
				player.say(CommandParser.getErrorText(['invalidPokemon', target]));
				return false;
			}
			if (!data.pokemon.includes(pokemon.id)) {
				player.say(pokemon.name + " cannot be used in this game.");
				return false;
			}
			if (!this.pokemonFitsParameters(pokemon)) {
				if (pokemon.forme && this.pokemonFitsParameters(Dex.getExistingPokemon(pokemon.baseSpecies))) {
					player.say("You must use " + pokemon.name + "'s base forme for the current parameters!");
				} else {
					player.say(pokemon.name + " does not follow the parameters!");
				}
				return false;
			}

			this.pokemonChoices.set(player, pokemon.name);
			player.say("You have selected **" + pokemon.name + "**!");
			return true;
		},
		pmOnly: true,
	},
};

const tests: GameFileTests<DelcattysHideAndSeek> = {
	'should have parameters for all possible numbers of remaining players': {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		test(game): void {
			// potentially +/- 1 Pokemon each round
			const maxPlayers = game.maxPlayers + 1;
			const parameterKeys = Object.keys(data.parameters);
			for (let i = game.minPlayers - 1; i < maxPlayers; i++) {
				let hasParameters = false;
				for (const key of parameterKeys) {
					if (data.parameters[key].length === i) {
						hasParameters = true;
						break;
					}
				}
				assert(hasParameters);
			}
		},
	},
	'should eliminate players who are charmed': {
		config: {
			async: true,
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game): Promise<void> {
			const players = addPlayers(game, 2);
			game.minPlayers = 2;
			game.start();
			assert(!game.canSelect);
			assert(!game.canCharm);
			const selector = game.charmer === players[0] ? players[1] : players[0];
			const pokemon = data.parameters[game.categories.join(", ")][0];
			game.canSelect = true;
			await runCommand('select', pokemon, Users.add(selector.name, selector.id), selector.name);
			assert(!game.canSelect);
			game.canCharm = true;
			await runCommand('charm', pokemon, game.room, game.charmer.name);
			assert(!game.charmer.eliminated);
			assert(selector.eliminated);
		},
	},
	'should eliminate the charmer if they fail to charm any players': {
		config: {
			async: true,
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game): Promise<void> {
			const players = addPlayers(game, 2);
			game.minPlayers = 2;
			game.start();
			const selector = game.charmer === players[0] ? players[1] : players[0];
			game.canSelect = true;
			await runCommand('select', data.parameters[game.categories.join(", ")][0], Users.add(selector.name, selector.id),
				selector.name);
			game.canCharm = true;
			await runCommand('charm', data.parameters[game.categories.join(", ")][1], game.room, game.charmer.name);
			assert(game.charmer.eliminated);
			assert(!selector.eliminated);
		},
	},
};

export const game: IGameFile<DelcattysHideAndSeek> = {
	aliases: ['delcattys', 'dhs'],
	category: 'strategy',
	class: DelcattysHideAndSeek,
	commandDescriptions: [Config.commandCharacter + "select [Pokemon]", Config.commandCharacter + "charm [Pokemon]"],
	commands,
	description: "Each round, the host will give a param that determines Pokemon players can hide behind (by PMing the host). One " +
		"player will be chosen to seek one Pokemon. If anyone hid behind it, they are eliminated. If not, the seeker is eliminated.",
	name: "Delcatty's Hide and Seek",
	noOneVsOne: true,
	mascot: "Delcatty",
	nonTrivialLoadData: true,
	tests,
};
