import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile, GameCommandReturnType } from "../types/games";

const name = "Serperior's Lengthy Chains";
const data: {parameters: Dict<string[]>; parameterKeys: string[]} = {
	parameters: {},
	parameterKeys: [],
};

let loadedData = false;

class SerperiorLengthyChains extends Game {
	bestChain: string[] = [];
	bestPlayer: Player | null = null;
	category: string = '';
	points = new Map<Player, number>();
	timeout: NodeJS.Timer | null = null;

	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Games.getPokemonList();
		for (const pokemon of pokemonList) {
			const pokemonParameters: string[] = ["Generation " + pokemon.gen, pokemon.color];
			if (Games.isIncludedPokemonTier(pokemon.tier)) pokemonParameters.push(pokemon.tier);
			for (const eggGroup of pokemon.eggGroups) {
				pokemonParameters.push(eggGroup + " Group");
			}
			for (const type of pokemon.types) {
				pokemonParameters.push(type + " Type");
			}
			for (const param of pokemonParameters) {
				if (!(param in data.parameters)) data.parameters[param] = [];
				data.parameters[param].push(pokemon.id);
			}
		}

		const parametersKeys = Object.keys(data.parameters);
		const len = parametersKeys.length;
		for (let i = 0; i < len; i++) {
			for (let j = 0; j < len; j++) {
				if (i === j) continue;
				const paramA = parametersKeys[i];
				const paramB = parametersKeys[j];
				const combined = paramA + ", " + paramB;
				data.parameters[combined] = [];
				for (const pokemon of data.parameters[paramA]) {
					if (data.parameters[paramB].includes(pokemon)) {
						data.parameters[combined].push(pokemon);
					}
				}
			}
		}

		for (const param in data.parameters) {
			if (data.parameters[param].length < 16) {
				delete data.parameters[param];
			} else {
				data.parameterKeys.push(param);
			}
		}

		loadedData = true;
	}

	onSignups(): void {
		this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
	}

	onNextRound(): void {
		this.bestChain = [];
		this.bestPlayer = null;
		this.category = this.sampleOne(data.parameterKeys);
		this.say("Make a chain of **" + this.category + "** Pokemon!");
		this.timeout = setTimeout(() => this.checkBestChain(), 15 * 1000);
	}

	checkBestChain(): void {
		this.category = '';
		if (!this.bestPlayer) {
			this.say("No one gave a valid chain!");
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		} else {
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
			this.say("**" + this.bestPlayer.name + "** advances to " + points + " point" + (points > 1 ? "s" : "") + " with their chain __" + this.bestChain.join(" + ") + "__!");
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		}
	}
	
	getChain(guess: string, chainSoFar: string[]): string[] {
		if (!guess || guess.length === 1) return chainSoFar;
		let chain = [];
		for (let i = guess.length; i > 0; i--) {
			const substr = guess.substr(0, i + 1);
			if (data.parameters[this.category].includes(substr)) {
				const pokemon = Dex.getExistingPokemon(substr);
				if (chainSoFar.includes(pokemon.name)) {
					return chainSoFar;
				}
				const curChain = chainSoFar.slice();
				curChain.push(pokemon.name);
				chain = this.getChain(guess.substr(i), curChain);
				if (chain) return chain;
			}
		}
		return [];
	}
}

const commands: Dict<ICommandDefinition<SerperiorLengthyChains>> = {
	guess: {
		command(target, room, user): GameCommandReturnType {
			if (!this.category) return false;
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
	commandDescriptions: [Config.commandCharacter + "g [Pokemon chain]"],
	commands,
	class: SerperiorLengthyChains,
	defaultOptions: ['points'],
	description: "Player's form chains of Pokemon that follow the given parameter! A chain is a sequence of pokemon that share 1 letter (such as PikachUxie)!",
	freejoin: true,
	name,
	mascot: "Serperior",
};
