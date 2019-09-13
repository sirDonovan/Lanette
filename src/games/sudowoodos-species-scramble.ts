import { DefaultGameOption } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing } from "./templates/guessing";

const name = "Sudowoodo's Species Scramble";
const data: {categories: Dict<string[]>} = {
	categories: {},
};
const categoryKeys: string[] = [];
let loadedData = false;

class SudowoodosSpeciesScramble extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Dex.getPokemonList(pokemon => !!pokemon.category);
		for (let i = 0; i < pokemonList.length; i++) {
			const pokemon = pokemonList[i];
			if (!(pokemon.category in data.categories)) {
				data.categories[pokemon.category] = [];
				categoryKeys.push(pokemon.category);
			}
			data.categories[pokemon.category].push(pokemon.species);
		}

		loadedData = true;
	}

	defaultOptions: DefaultGameOption[] = ['points'];

	onSignups() {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
	}

	async setAnswers() {
		const category = this.sampleOne(categoryKeys);
		this.answers = data.categories[category];
		this.hint = "Sudowoodo imitated the **" + category + " Pokemon**!";
	}
}

export const game: IGameFile<SudowoodosSpeciesScramble> = {
	aliases: ["sudowoodos", "sss", "speciesscramble"],
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	class: SudowoodosSpeciesScramble,
	description: "Players guess Pokemon based on the given categories!",
	freejoin: true,
	name,
	mascot: "Sudowoodo",
	modes: ['survival'],
};
