import type { Room } from "../rooms";
import type { IGameFile } from "../types/games";
import type { User } from "../users";
import { game as guessingGame, Guessing } from "./templates/guessing";

const data: {categories: Dict<string[]>} = {
	categories: {},
};
const categoryKeys: string[] = [];

class SudowoodosSpeciesScramble extends Guessing {
	static loadData(room: Room | User): void {
		const pokemonList = Games.getPokemonList(pokemon => !!pokemon.category);
		for (const pokemon of pokemonList) {
			if (!(pokemon.category in data.categories)) {
				data.categories[pokemon.category] = [];
				categoryKeys.push(pokemon.category);
			}
			data.categories[pokemon.category].push(pokemon.name);
		}
	}

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		const category = this.sampleOne(categoryKeys);
		this.answers = data.categories[category];
		this.hint = "<b>Sudowoodo imitated</b>: <i>the " + category + " Pokemon</i>";
	}
}

export const game: IGameFile<SudowoodosSpeciesScramble> = Games.copyTemplateProperties(guessingGame, {
	aliases: ["sudowoodos", "sss", "speciesscramble"],
	category: 'knowledge',
	class: SudowoodosSpeciesScramble,
	defaultOptions: ['points'],
	description: "Players guess Pokemon based on the given categories!",
	freejoin: true,
	name: "Sudowoodo's Species Scramble",
	mascot: "Sudowoodo",
	minigameCommand: 'sudowoodospecies',
	minigameCommandAliases: ['sspecies'],
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess a Pokemon based on the given category!",
	modes: ['survival', 'team'],
});
