import { assert } from "../test/test-tools";
import type { GameFileTests, IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "mnemonicmaster";

const STANDARD_ABILITY_CHARACTERS_REGEX = /[^a-zA-Z0-9\- ]/g;

const data: {abilities: Dict<string[]>} = {
	abilities: {},
};
const keys: string[] = [];

class GalladesAbilityTest extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'mnemonicmaster': {name: "Mnemonic Master", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};

	allAnswersAchievement = GalladesAbilityTest.achievements.mnemonicmaster;
	roundTime: number = 20 * 1000;

	static loadData(): void {
		const pokemonList = Games.getPokemonList();
		for (const pokemon of pokemonList) {
			const abilities: string[] = [];
			const hiddenSpecialAbilities: string[] = [];
			for (const i in pokemon.abilities) {
				// @ts-expect-error
				const ability = pokemon.abilities[i] as string;
				const key = ability.replace(STANDARD_ABILITY_CHARACTERS_REGEX, "").split(" ").map(x => x[0]).join("");
				if (i === 'H' || i === 'S') {
					hiddenSpecialAbilities.push(key);
				} else {
					abilities.push(key);
				}
			}

			const key = abilities.join(", ") + (hiddenSpecialAbilities.length ? " | <i>" + hiddenSpecialAbilities.join(", ") + "</i>" : "");
			if (!(key in data.abilities)) data.abilities[key] = [];
			data.abilities[key].push(pokemon.name);
			keys.push(key);
		}
	}

	generateAnswer(): void {
		const key = this.sampleOne(keys);
		this.answers = data.abilities[key];
		this.hint = "<b>Randomly generated abilities</b>: " + key;
	}
}

const tests: GameFileTests<GalladesAbilityTest> = {
	'should remove parentheses from keys': {
		test(): void {
			assert(Object.keys(data.abilities).length);
			assert(!("AO(" in data.abilities));
		},
	},
};

export const game: IGameFile<GalladesAbilityTest> = Games.copyTemplateProperties(questionAndAnswerGame, {
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
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a Pokemon based on the initials of its abilities!",
	modeProperties: {
		'timeattack': {
			roundTime: 10 * 1000,
		},
	},
	modes: ["survival", "team", "timeattack"],
	tests: Object.assign({}, questionAndAnswerGame.tests, tests),
});
