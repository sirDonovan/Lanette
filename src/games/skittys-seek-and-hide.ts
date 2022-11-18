import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import { assert } from "../test/test-tools";
import type { GameCommandDefinitions, GameFileTests, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";

const SELECT_WARNING_TIMER = 45 * 1000;
const SELECT_ROUND_TIMER = 60 * 1000;
const SELECT_COMMAND = "select";

const data: {'parameters': Dict<string[]>; 'pokemon': string[]} = {
	"parameters": {},
	"pokemon": [],
};

class SkittysSeekAndHide extends ScriptedGame {
	canCharm: boolean = false;
	canSelect: boolean = false;
	categories: string[] = [];
	maxPlayers: number = 15;
	lives = new Map<Player, number>();
	pokemonChoices = new Map<Player, string>();
	startingLives: number = 3;

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

	onAddPlayer(player: Player): boolean {
		this.lives.set(player, this.startingLives);
		return true;
	}

	onStart(): void {
		this.setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onNextRound(): void {
		this.canSelect = false;

		const remainingPlayerCount = this.getRemainingPlayerCount();
		if (remainingPlayerCount < 3) return this.end();

		this.pokemonChoices.clear();
		const requiredPokemon = Math.max(2, remainingPlayerCount - 1);

		const param = this.sampleOne(Object.keys(data.parameters).filter(x => data.parameters[x].length === requiredPokemon));
		this.categories = param.split(", ");

		const pokemonButtons: string[] = [];
		for (const id of data.parameters[param]) {
			const pokemon = Dex.getExistingPokemon(id);
			pokemonButtons.push(this.getQuietPmButton(SELECT_COMMAND + " " + pokemon.name, Dex.getPokemonIcon(pokemon) + pokemon.name));
		}

		const uhtmlName = this.uhtmlBaseName + '-round-html';
		const html = this.getRoundHtml(players => this.getPlayerLives(players));
		this.onUhtml(uhtmlName, html, () => {
			const text = "Select a Pokemon that fits the parameters **" + param + "** with ``" +
				Config.commandCharacter + SELECT_COMMAND + " [Pokemon]`` in PMs!";
			this.on(text, () => {
				this.canSelect = true;

				const playerHtml = pokemonButtons.join("&nbsp;");
				for (const i in this.players) {
					if (!this.players[i].eliminated) this.sendPlayerActions(this.players[i], playerHtml);
				}

				this.setTimeout(() => {
					const roundTimeout = SELECT_ROUND_TIMER - SELECT_WARNING_TIMER;
					const timeoutString = Tools.toDurationString(roundTimeout);
					for (const i in this.players) {
						const player = this.players[i];
						if (!player.eliminated && !this.pokemonChoices.has(player)) {
							player.say("You have " + timeoutString + " left to select a Pokemon!");
						}
					}

					this.setTimeout(() => this.tallySelectedPokemon(), roundTimeout);
				}, SELECT_WARNING_TIMER);
			});

			this.onCommands([SELECT_COMMAND], {max: this.getRemainingPlayerCount(), remainingPlayersMax: true},
				() => this.tallySelectedPokemon());

			this.setTimeout(() => this.say(text), 5 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	tallySelectedPokemon(): void {
		if (this.timeout) clearTimeout(this.timeout);
		this.offCommands(['select']);

		this.canSelect = false;

		const selectedPokemon: Dict<Player[]> = {};
		for (const id in this.players) {
			if (this.players[id].eliminated) continue;
			const player = this.players[id];
			const pokemon = this.pokemonChoices.get(player);
			if (!pokemon) {
				this.eliminatePlayer(player, "You did not select a Pokemon!");
				continue;
			}

			if (!(pokemon in selectedPokemon)) selectedPokemon[pokemon] = [];
			selectedPokemon[pokemon].push(player);
		}

		if (!this.getRemainingPlayerCount()) {
			this.say("No one chose a valid Pokemon!");
			this.end();
			return;
		}

		const sortedKeys = Object.keys(selectedPokemon).sort((a, b) => selectedPokemon[b].length - selectedPokemon[a].length);
		const highestPlayers = selectedPokemon[sortedKeys[0]].length;
		const mostSelected = sortedKeys.filter(x => selectedPokemon[x].length === highestPlayers);
		const damaged: string[] = [];
		for (const pokemon of mostSelected) {
			for (const player of selectedPokemon[pokemon]) {
				damaged.push(player.name);
				const lives = this.addLives(player, -1);
				if (!lives) {
					this.eliminatePlayer(player, "You lost your last life!");
				} else {
					player.say("You lost 1 life! You have " + lives + " remaining.");
				}
			}
		}

		const text = "**" + Tools.joinList(mostSelected) + "** " + (mostSelected.length > 1 ? "were" : "was") +
			" hiding the most players (" + Tools.joinList(damaged) + ")!";
		this.on(text, () => {
			this.setTimeout(() => this.nextRound(), 5 * 1000);
		});
		this.say(text);
	}

	pokemonFitsParameters(pokemon: IPokemon): boolean {
		return data.parameters[this.categories.join(', ')].includes(pokemon.id);
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			this.winners.set(this.players[i], 1);
			this.addBits(this.players[i], 500);
		}

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.pokemonChoices.clear();
	}
}

const commands: GameCommandDefinitions<SkittysSeekAndHide> = {
	[SELECT_COMMAND]: {
		command(target, room, user) {
			if (!this.canSelect) return false;
			const player = this.players[user.id];
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

const tests: GameFileTests<SkittysSeekAndHide> = {
	'should have parameters for all possible numbers of remaining players': {
		test(game): void {
			const minPlayers = Math.max(2, game.minPlayers - 1);
			const maxPlayers = game.maxPlayers - 1;
			const parameterKeys = Object.keys(data.parameters);
			for (let i = minPlayers; i < maxPlayers; i++) {
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
};

export const game: IGameFile<SkittysSeekAndHide> = {
	aliases: ['skittys', 'ssh'],
	category: 'luck',
	class: SkittysSeekAndHide,
	commandDescriptions: [Config.commandCharacter + "select [Pokemon]"],
	commands,
	description: "Each round, players choose Pokemon to hide behind based on the given parameters. " +
		"The Pokemon that the most players hide behind will steal 1 life!",
	name: "Skitty's Seek and Hide",
	mascot: "Skitty",
	nonTrivialLoadData: true,
	tests,
};
