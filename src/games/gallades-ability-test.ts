import type { AchievementsDict, IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from "./templates/guessing";

const achievements: AchievementsDict = {
	'mnemonicmaster': {name: "Mnemonic Master", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
};

const data: {abilities: Dict<string[]>} = {
	abilities: {},
};
const keys: string[] = [];

class GalladesAbilityTest extends Guessing {
	allAnswersAchievement = achievements.mnemonicmaster;
	roundTime: number = 20 * 1000;

	static loadData(): void {
		const pokemonList = Games.getPokemonList();
		for (const pokemon of pokemonList) {
			const abilities: string[] = [];
			let hiddenAbility = '';
			for (const i in pokemon.abilities) {
				// @ts-expect-error
				const ability = pokemon.abilities[i] as string;
				const key = ability.split(" ").map(x => x[0]).join("");
				if (i === 'H') {
					hiddenAbility = key;
				} else {
					abilities.push(key);
				}
			}

			const key = abilities.join(", ") + (hiddenAbility ? " | <i>" + hiddenAbility + "</i>" : "");
			if (!(key in data.abilities)) data.abilities[key] = [];
			data.abilities[key].push(pokemon.name);
			keys.push(key);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		const key = this.sampleOne(keys);
		this.answers = data.abilities[key];
		this.hint = "<b>Randomly generated abilities</b>: " + key;
	}
}

export const game: IGameFile<GalladesAbilityTest> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['gallades', 'gat', 'abilitytest', 'tya'],
	category: 'knowledge',
	class: GalladesAbilityTest,
	defaultOptions: ['points'],
	description: "Each round, players must guess Pokemon based on the initials of their abilities!",
	formerNames: ["Test Your Abilities"],
	freejoin: true,
	name: "Gallade's Ability Test",
	mascot: "Gallade",
	minigameCommand: 'abilitytest',
	minigameCommandAliases: ['atest', 'gatest'],
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess a Pokemon based on the initials of its abilities!",
	modes: ["survival", "team"],
});