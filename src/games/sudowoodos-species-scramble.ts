import { DefaultGameOption } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing } from "./templates/guessing";

const name = "Sudowoodo's Species Scramble";
const data: Dict<string[]> = {};
const categories: string[] = [];
let loadedData = false;

class SudowoodosSpeciesScramble extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Dex.getPokemonList(pokemon => !pokemon.category);
		for (let i = 0; i < pokemonList.length; i++) {
			const pokemon = pokemonList[i];
			if (!(pokemon.category in data)) {
				data[pokemon.category] = [];
				categories.push(pokemon.category);
			}
			data[pokemon.category].push(pokemon.species);
		}

		loadedData = true;
	}

	defaultOptions: DefaultGameOption[] = ['points'];

	onSignups() {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
	}

	setAnswers() {
		const category = this.sampleOne(categories);
		this.answers = data[category];
		this.hint = "Sudowoodo imitated the **" + category + " Pokemon**!";
	}
}

export const game: IGameFile<SudowoodosSpeciesScramble> = {
	aliases: ["sudowoodos", "sss", "speciesscramble"],
	battleFrontierCategory: 'Knowledge',
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	class: SudowoodosSpeciesScramble,
	description: "Players guess Pokemon based on the given categories!",
	freejoin: true,
	name,
	mascot: "Sudowoodo",
	modes: ['survival'],
};
