import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { DefaultGameOption, Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";

const name = "Serperior's Lengthy Chains";
const parameters: Dict<string[]> = {};

let loadedData = false;

class SerperiorLengthyChains extends Game {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Dex.getPokemonList();
		for (let i = 0; i < pokemonList.length; i++) {
			const pokemon = pokemonList[i];
			const pokemonParameters: string[] = ["Generation " + pokemon.gen, pokemon.color];
			if (pokemon.tier !== 'Illegal') pokemonParameters.push(pokemon.tier);
			for (let j = 0, len = pokemon.eggGroups.length; j < len; j++) {
				pokemonParameters.push(pokemon.eggGroups[j] + " Group");
			}
			for (let j = 0, len = pokemon.types.length; j < len; j++) {
				pokemonParameters.push(pokemon.types[j] + " Type");
			}
			for (let i = 0; i < pokemonParameters.length; i++) {
				const param = pokemonParameters[i];
				if (!(param in parameters)) parameters[param] = [];
				parameters[param].push(pokemon.id);
			}
		}

		const parametersKeys = Object.keys(parameters);
		const len = parametersKeys.length;
		for (let i = 0; i < len; i++) {
			for (let j = 0; j < len; j++) {
				if (i === j) continue;
				const paramA = parametersKeys[i];
				const paramB = parametersKeys[j];
				const combined = paramA + ", " + paramB;
				parameters[combined] = [];
				for (let k = 0; k < parameters[paramA].length; k++) {
					if (parameters[paramB].includes(parameters[paramA][k])) {
						parameters[combined].push(parameters[paramA][k]);
					}
				}
			}
		}

		for (const param in parameters) {
			if (parameters[param].length < 16) delete parameters[param];
		}

		loadedData = true;
	}

	bestChain: string[] = [];
	bestPlayer: Player | null = null;
	category: string = '';
	defaultOptions: DefaultGameOption[] = ['points'];
	points = new Map<Player, number>();
	timeout: NodeJS.Timer | null = null;

	onSignups() {
		this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
	}

	onNextRound() {
		this.bestChain = [];
		this.bestPlayer = null;
		this.category = Tools.sampleOne(Object.keys(parameters));
		this.say("Make a chain of **" + this.category + "** Pokemon!");
		this.timeout = setTimeout(() => this.checkBestChain(), 15 * 1000);
	}

	checkBestChain() {
		this.category = '';
		if (!this.bestPlayer) {
			this.say("Nobody gave a valid chain!");
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		} else {
			let points = this.points.get(this.bestPlayer) || 0;
			points++;
			this.points.set(this.bestPlayer, points);
			if (points >= this.options.points) {
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
		for (let i = 0; i < guess.length; i++) {
			const substr = guess.substr(0, i + 1);
			if (parameters[this.category].indexOf(substr) !== -1) {
				const pokemon = Dex.getExistingPokemon(substr);
				if (chainSoFar.includes(pokemon.species)) return chainSoFar;
				const curChain = chainSoFar.slice();
				curChain.push(pokemon.species);
				chain = this.getChain(guess.substr(i), curChain);
				if (chain) return chain;
			}
		}
		return [];
	}
}

const commands: Dict<ICommandDefinition<SerperiorLengthyChains>> = {
	guess: {
		command(target, room, user) {
			if (!this.category) return;
			const guess = Tools.toId(target);
			if (!guess) return;
			const chain = this.getChain(guess, []);
			if (chain.length > this.bestChain.length) {
				this.bestPlayer = this.createPlayer(user) || this.players[user.id];
				this.bestChain = chain;
			}
		},
		aliases: ['g'],
	},
};

export const game: IGameFile<SerperiorLengthyChains> = {
	aliases: ["serperiors", "slc"],
	battleFrontierCategory: 'Puzzle',
	commandDescriptions: [Config.commandCharacter + "g [Pokemon chain]"],
	commands,
	class: SerperiorLengthyChains,
	description: "Player's form chains of Pokemon that follow the given parameter! A chain is a sequence of pokemon that share 1 letter (such as PikachUxie)!",
	freejoin: true,
	name,
	mascot: "Serperior",
};
