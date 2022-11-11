import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import { addPlayers, assert, runCommand } from "../test/test-tools";
import type { GameCommandDefinitions, GameFileTests, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";

const data: {'parameters': Dict<string[]>; 'parameterLengths': Dict<number>; 'pokemon': string[]} = {
	"parameters": {},
	"parameterLengths": {},
	"pokemon": [],
};

const MINIMUM_PARAMETERS = 2;
const CHARM_WARNING_TIMER = 45 * 1000;
const CHARM_ROUND_TIMER = 60 * 1000;
const SELECT_COMMAND = "select";
const CHARM_COMMAND = "charm";

class DelcattysHideAndSeek extends ScriptedGame {
	canCharm: boolean = false;
	canSelect: boolean = false;
	categories: string[] = [];
	maxPlayers: number = 15;
	pokemonChoices = new Map<Player, string>();
	roundPokemon: string[] = [];

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

		for (const i in data.parameters) {
			data.parameterLengths[i] = data.parameters[i].length;
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
		const hideCount = remainingPlayerCount - 1;
		let requiredPokemon = Math.max(hideCount, MINIMUM_PARAMETERS);
		if (requiredPokemon > MINIMUM_PARAMETERS) requiredPokemon += this.random(3) - 1;

		const param = this.sampleOne(Object.keys(data.parameters).filter(x => data.parameterLengths[x] === requiredPokemon));
		this.roundPokemon = data.parameters[param];
		this.categories = param.split(", ");

		const pokemonButtons: string[] = [];
		for (const id of this.roundPokemon) {
			const pokemon = Dex.getExistingPokemon(id);
			pokemonButtons.push(this.getQuietPmButton(SELECT_COMMAND + " " + pokemon.name, Dex.getPokemonIcon(pokemon) + pokemon.name));
		}

		const otherPlayers: Player[] = [];
		for (const i in this.players) {
			if (this.players[i].eliminated || this.charmer === this.players[i]) continue;
			otherPlayers.push(this.players[i]);
		}

		const text = "**" + this.charmer.name + "** is the charmer! " + Tools.joinList(otherPlayers.map(x => x.name)) + ", select a " +
			"Pokemon that fits the parameters **" + param + "** with ``" + Config.commandCharacter + SELECT_COMMAND + " [Pokemon]`` " +
			"in PMs!";
		this.on(text, () => {
			this.canSelect = true;

			const playerHtml = pokemonButtons.join("&nbsp;");
			for (const player of otherPlayers) {
				this.sendPlayerActions(player, playerHtml);
			}

			this.setTimeout(() => this.selectCharmedPokemon(), 60 * 1000);
		});

		this.onCommands([SELECT_COMMAND], {max: hideCount, remainingPlayersMax: true}, () => this.selectCharmedPokemon());
		this.say(text);
	}

	selectCharmedPokemon(): void {
		if (this.timeout) clearTimeout(this.timeout);
		this.offCommands([SELECT_COMMAND]);

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

		const text = this.charmer.name + " please select a Pokemon that fits the parameters **" + this.categories.join(", ") + "** " +
			"to charm with ``" + Config.commandCharacter + CHARM_COMMAND + " [Pokemon]``!";
		this.on(text, () => {
			this.canCharm = true;

			const pokemonButtons: string[] = [];
			for (const id of this.roundPokemon) {
				const pokemon = Dex.getExistingPokemon(id);
				pokemonButtons.push(this.getMsgRoomButton(CHARM_COMMAND + " " + pokemon.name, Dex.getPokemonIcon(pokemon) + pokemon.name));
			}
			this.sendPlayerActions(this.charmer, pokemonButtons.join("&nbsp;"));

			this.setTimeout(() => {
				const roundTimeout = CHARM_ROUND_TIMER - CHARM_WARNING_TIMER;
				this.charmer.say("You have " + Tools.toDurationString(roundTimeout) + " left to charm a Pokemon!");

				this.setTimeout(() => {
					this.canCharm = false;
					this.say("**" + this.charmer.name + "** did not charm a Pokemon and has been eliminated from the game!");
					this.eliminatePlayer(this.charmer);
					this.setTimeout(() => this.nextRound(), 5 * 1000);
				}, roundTimeout);
			}, CHARM_WARNING_TIMER);
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

	destroyPlayers(): void {
		super.destroyPlayers();

		this.pokemonChoices.clear();
	}
}

const commands: GameCommandDefinitions<DelcattysHideAndSeek> = {
	[CHARM_COMMAND]: {
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
					this.eliminatePlayer(otherPlayer);
					eliminatedPlayers.push(otherPlayer.name);
				}
			}

			if (!eliminatedPlayers.length) {
				this.say("**" + this.charmer.name + "** charmed **" + pokemon.name + "** but no one chose that Pokemon! " +
					this.charmer.name + " has been eliminated from the game!");
				this.eliminatePlayer(this.charmer);
			} else {
				this.say("**" + this.charmer.name + "** charmed **" + pokemon.name + "** and eliminated " +
					Tools.joinList(eliminatedPlayers) + " from the game!");
			}

			this.setTimeout(() => this.nextRound(), 5 * 1000);
			return true;
		},
		chatOnly: true,
	},
	[SELECT_COMMAND]: {
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
		test(game): void {
			// potentially +/- 1 Pokemon each round
			const maxPlayers = game.maxPlayers + 1;
			const parameterKeys = Object.keys(data.parameters);
			for (let i = MINIMUM_PARAMETERS; i < maxPlayers; i++) {
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
		test(game): void {
			const players = addPlayers(game, 2);
			game.minPlayers = 2;
			game.start();
			assert(!game.canSelect);
			assert(!game.canCharm);
			const selector = game.charmer === players[0] ? players[1] : players[0];
			const pokemon = data.parameters[game.categories.join(", ")][0];
			game.canSelect = true;
			runCommand('select', pokemon, Users.add(selector.name, selector.id), selector.name);
			assert(!game.canSelect);
			game.canCharm = true;
			runCommand('charm', pokemon, game.room, game.charmer.name);
			assert(!game.charmer.eliminated);
			assert(selector.eliminated);
		},
	},
	'should eliminate the charmer if they fail to charm any players': {
		test(game): void {
			const players = addPlayers(game, 2);
			game.minPlayers = 2;
			game.start();
			const selector = game.charmer === players[0] ? players[1] : players[0];
			game.canSelect = true;
			runCommand('select', data.parameters[game.categories.join(", ")][0], Users.add(selector.name, selector.id), selector.name);
			game.canCharm = true;
			runCommand('charm', data.parameters[game.categories.join(", ")][1], game.room, game.charmer.name);
			assert(game.charmer.eliminated);
			assert(!selector.eliminated);
		},
	},
};

export const game: IGameFile<DelcattysHideAndSeek> = {
	aliases: ['delcattys', 'dhs'],
	category: 'luck',
	class: DelcattysHideAndSeek,
	commandDescriptions: [Config.commandCharacter + "select [Pokemon]", Config.commandCharacter + "charm [Pokemon]"],
	commands,
	description: "Each round, the host will give a param that determines Pokemon players can hide behind (by PMing the host). One " +
		"player will be chosen to seek one Pokemon. If anyone hid behind it, they are eliminated. If not, the seeker is eliminated.",
	name: "Delcatty's Hide and Seek",
	mascot: "Delcatty",
	nonTrivialLoadData: true,
	tests,
};
