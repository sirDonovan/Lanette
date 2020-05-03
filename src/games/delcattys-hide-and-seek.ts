import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { addPlayers, assert, runCommand } from "../test/test-tools";
import { GameFileTests, IGameFile, GameCommandReturnType } from "../types/games";
import { IPokemon } from "../types/dex";
import { User } from "../users";

const name = "Delcatty's Hide and Seek";
const data: {'parameters': Dict<string[]>; 'pokemon': string[]} = {
	"parameters": {},
	"pokemon": [],
};
let loadedData = false;

class DelcattysHideAndSeek extends Game {
	canCharm: boolean = false;
	canSelect: boolean = false;
	categories: string[] = [];
	maxPlayers: number = 15;
	pokemonChoices = new Map<Player, string>();

	charmer!: Player;

	static loadData(room: Room | User): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonCategories: Dict<string[]> = {};
		const pokemonList = Games.getPokemonList();
		for (const pokemon of pokemonList) {
			pokemonCategories[pokemon.id] = [];
			for (let j = 0, len = pokemon.eggGroups.length; j < len; j++) {
				pokemonCategories[pokemon.id].push(pokemon.eggGroups[j] + " Group");
			}
			for (let j = 0, len = pokemon.types.length; j < len; j++) {
				pokemonCategories[pokemon.id].push(pokemon.types[j] + " Type");
			}
			pokemonCategories[pokemon.id].push("Generation " + pokemon.gen);
			if (Games.isIncludedPokemonTier(pokemon.tier)) pokemonCategories[pokemon.id].push(pokemon.tier);
			pokemonCategories[pokemon.id].push(pokemon.color);
			data.pokemon.push(pokemon.id);
		}

		for (const i in pokemonCategories) {
			for (const param of pokemonCategories[i]) {
				if (!(param in data.parameters)) data.parameters[param] = [];
				data.parameters[param].push(i);
			}
		}

		const parameterKeys = Object.keys(data.parameters);
		for (let i = 0, len = parameterKeys.length; i < len; i++) {
			for (let j = 0; j < len; j++) {
				if (i === j) continue;
				const paramA = parameterKeys[i];
				const paramB = parameterKeys[j];
				const parameter = paramA + ", " + paramB;
				data.parameters[parameter] = [];
				for (const pokemon of data.parameters[paramA]) {
					if (data.parameters[paramB].includes(pokemon)) {
						data.parameters[parameter].push(pokemon);
					}
				}
			}
		}

		loadedData = true;
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
		this.charmer = this.shufflePlayers()[0];
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
			"** Pokemon with ``" + Config.commandCharacter +"select [Pokemon]`` in PMs!";
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
		return data.parameters[this.categories.join(', ')].includes(Tools.toId(pokemon.name));
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

const commands: Dict<ICommandDefinition<DelcattysHideAndSeek>> = {
	charm: {
		command(target, room, user): GameCommandReturnType {
			const player = this.players[user.id];
			if (player !== this.charmer || !this.canCharm) return false;
			target = Tools.toId(target);
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) {
				player.say("'" + target.trim() + "' is not a valid Pokemon.");
				return false;
			}
			if (!data.pokemon.includes(pokemon.id)) {
				player.say(pokemon.name + " is not in this game.");
				return false;
			}
			if (!this.pokemonFitsParameters(pokemon)) {
				player.say("**" + pokemon.name + "** does not follow the parameters.");
				return false;
			}

			this.canCharm = false;

			const eliminatedPlayers: string[] = [];
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const player = this.players[i];
				if (this.pokemonChoices.get(player) === pokemon.name) {
					this.eliminatePlayer(player, "Your Pokemon was charmed!");
					eliminatedPlayers.push(player.name);
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
		command(target, room, user): GameCommandReturnType {
			const player = this.players[user.id];
			if (!this.canSelect || !player || player.eliminated) return false;
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
				player.say("'" + target + "' is not a valid Pokemon.");
				return false;
			}
			if (!data.pokemon.includes(pokemon.id)) {
				player.say(pokemon.name + " is not in this game.");
				return false;
			}
			if (!this.pokemonFitsParameters(pokemon)) {
				player.say("**" + pokemon.name + "** does not follow the parameters!");
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
		test(game, format): void {
			// 1 extra Pokemon can be added in onNextRound()
			const maxPlayers = game.maxPlayers + 1;
			const parameterKeys = Object.keys(data.parameters);
			for (let i = game.minPlayers; i < maxPlayers; i++) {
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
		async test(game, format): Promise<void> {
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
		async test(game, format): Promise<void> {
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
	class: DelcattysHideAndSeek,
	commandDescriptions: [Config.commandCharacter + "select [Pokemon]", Config.commandCharacter + "charm [Pokemon]"],
	commands,
	description: "Each round, the host will give a param that determines Pokemon players can hide behind (by PMing the host). One " +
		"player will be chosen to seek one Pokemon. If anyone hid behind it, they are eliminated. If not, the seeker is eliminated.",
	name,
	mascot: "Delcatty",
	tests,
};
