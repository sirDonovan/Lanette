import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

const minimumParameterResults = 15;

type DataTypes = 'pokemon' | 'moves';
const data: {parameters: KeyedDict<DataTypes, Dict<string[]>>; parameterKeys: KeyedDict<DataTypes, string[]>} = {
	parameters: {
		pokemon: {},
		moves: {},
	},
	parameterKeys: {
		pokemon: [],
		moves: [],
	},
};

class SerperiorLengthyChains extends ScriptedGame {
	bestChain: string[] = [];
	bestPlayer: Player | null = null;
	canChain: boolean = false;
	category: string = '';
	dataType: DataTypes = 'pokemon';
	inactiveRoundLimit: number = 5;
	points = new Map<Player, number>();

	static loadData(): void {
		for (const move of Games.getMovesList()) {
			const moveParameters: string[] = [move.category, "Generation " + move.gen, move.pp + " Power Points", move.type + " Type"];
			if (move.accuracy === true) {
				moveParameters.push("Does not check accuracy");
			} else {
				moveParameters.push(move.accuracy + "% Accuracy");
			}

			if (!move.basePowerCallback) moveParameters.push(move.basePower + " Base Power");
			for (const param of moveParameters) {
				if (!(param in data.parameters.moves)) data.parameters.moves[param] = [];
				data.parameters.moves[param].push(move.id);
			}
		}

		for (const pokemon of Games.getPokemonList()) {
			const pokemonParameters: string[] = ["Generation " + pokemon.gen, pokemon.color];
			if (Games.isIncludedPokemonTier(pokemon.tier)) pokemonParameters.push(pokemon.tier);
			for (const eggGroup of pokemon.eggGroups) {
				pokemonParameters.push(eggGroup + " Group");
			}
			for (const type of pokemon.types) {
				pokemonParameters.push(type + " Type");
			}
			for (const param of pokemonParameters) {
				if (!(param in data.parameters.pokemon)) data.parameters.pokemon[param] = [];
				data.parameters.pokemon[param].push(pokemon.id);
			}
		}

		for (const dataType of ['pokemon', 'moves'] as DataTypes[]) {
			const parametersKeys = Object.keys(data.parameters[dataType]);
			const len = parametersKeys.length;
			for (let i = 0; i < len; i++) {
				for (let j = 0; j < len; j++) {
					if (i === j || data.parameters[dataType][parametersKeys[i]].length < minimumParameterResults ||
						data.parameters[dataType][parametersKeys[j]].length < minimumParameterResults) continue;

					const paramA = parametersKeys[i];
					const paramB = parametersKeys[j];
					const combined = paramA + ", " + paramB;
					data.parameters[dataType][combined] = [];
					for (const pokemon of data.parameters[dataType][paramA]) {
						if (data.parameters[dataType][paramB].includes(pokemon)) {
							data.parameters[dataType][combined].push(pokemon);
						}
					}
				}
			}

			for (const param in data.parameters[dataType]) {
				if (data.parameters[dataType][param].length < minimumParameterResults) {
					delete data.parameters[dataType][param];
				} else {
					data.parameterKeys[dataType].push(param);
				}
			}
		}
	}

	onSignups(): void {
		this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
	}

	onNextRound(): void {
		this.canChain = false;
		if (this.round > 1) {
			if (!this.bestPlayer) {
				this.say("No one gave a valid chain!");
				this.inactiveRounds++;
				if (this.inactiveRounds === this.inactiveRoundLimit) {
					this.inactivityEnd();
					return;
				}
			} else {
				if (this.inactiveRounds) this.inactiveRounds = 0;

				let points = this.points.get(this.bestPlayer) || 0;
				points++;
				this.points.set(this.bestPlayer, points);
				if (points >= this.format.options.points) {
					this.say("**" + this.bestPlayer.name + "** wins the game with their chain __" + this.bestChain.join(" + ") + "__!");
					this.winners.set(this.bestPlayer, 1);
					this.convertPointsToBits(50);
					this.end();
					return;
				}
				this.say("**" + this.bestPlayer.name + "** advances to " + points + " point" + (points > 1 ? "s" : "") + " with their " +
					"chain " + "__" + this.bestChain.join(" + ") + "__!");
			}
		}

		this.bestChain = [];
		this.bestPlayer = null;
		this.category = this.sampleOne(data.parameterKeys[this.dataType]);

		const uhtmlName = this.uhtmlBaseName + '-round-html';
		const html = this.getRoundHtml(players => this.getPlayerPoints(players));
		this.onUhtml(uhtmlName, html, () => {
			const text = "Make a chain of **" + this.category + "** " + (this.dataType === 'moves' ? "moves" : "Pokemon") + "!";
			this.on(text, () => {
				this.canChain = true;
				this.timeout = setTimeout(() => this.nextRound(), 15 * 1000);
			});
			this.timeout = setTimeout(() => this.say(text), 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	getChain(guess: string, chainSoFar: string[]): string[] {
		if (!guess || guess.length === 1) return chainSoFar;
		let chain = [];
		const moves = this.dataType === 'moves';
		for (let i = guess.length - 1; i > 0; i--) {
			const substr = guess.substr(0, i + 1);
			if (data.parameters[this.dataType][this.category].includes(substr)) {
				const curChain = chainSoFar.slice();
				if (moves) {
					const move = Dex.getExistingMove(substr);
					if (chainSoFar.includes(move.name)) {
						return chainSoFar;
					}
					curChain.push(move.name);
				} else {
					const pokemon = Dex.getExistingPokemon(substr);
					if (chainSoFar.includes(pokemon.name)) {
						return chainSoFar;
					}
					curChain.push(pokemon.name);
				}

				chain = this.getChain(guess.substr(i), curChain);
				if (chain.length) return chain;
			}
		}
		return [];
	}
}

const commands: GameCommandDefinitions<SerperiorLengthyChains> = {
	guess: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canChain) return false;
			const guess = Tools.toId(target);
			if (!guess) return false;
			const chain = this.getChain(guess, []);
			if (chain.length > this.bestChain.length) {
				this.bestPlayer = this.createPlayer(user) || this.players[user.id];
				this.bestChain = chain;
			}
			return true;
		},
		aliases: ['g'],
	},
};

export const game: IGameFile<SerperiorLengthyChains> = {
	aliases: ["serperiors", "slc"],
	category: 'puzzle',
	commandDescriptions: [Config.commandCharacter + "g [chain]"],
	commands,
	class: SerperiorLengthyChains,
	defaultOptions: ['points'],
	description: "Player's form chains of Pokemon that follow the given parameters! A chain is a sequence of Pokemon that share 1 letter " +
		"(such as PikachUxie)!",
	freejoin: true,
	name: "Serperior's Lengthy Chains",
	mascot: "Serperior",
	nonTrivialLoadData: true,
	variants: [
		{
			name: "Serperior's Lengthy Move Chains",
			aliases: ['slmc'],
			description: "Player's form chains of moves that follow the given parameters! A chain is a sequence of moves that share 1 " +
				"letter (such as AirSlasHealBlock)!",
			variantAliases: ['move', 'moves'],
			dataType: 'moves',
		},
	],
};
