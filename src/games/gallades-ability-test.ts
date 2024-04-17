import { assert } from "../test/test-tools";
import type { GameFileTests, IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "mnemonicmaster";

const STANDARD_ABILITY_CHARACTERS_REGEX = /[^a-zA-Z0-9\- ]/g;

class GalladesAbilityTest extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'mnemonicmaster': {name: "Mnemonic Master", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = GalladesAbilityTest.achievements.mnemonicmaster;
	hintPrefix: string = "Randomly generated abilities";
	roundTime: number = 20 * 1000;

	static async loadData(): Promise<void> { // eslint-disable-line @typescript-eslint/require-await
		const hints: Dict<string[]> = {};
		const hintKeys: string[] = [];

		for (const pokemon of Games.getPokemonList()) {
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
			if (!(key in hints)) {
				hints[key] = [];
				hintKeys.push(key);
			}
			hints[key].push(pokemon.name);
		}

		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
	}
}

const tests: GameFileTests<GalladesAbilityTest> = {
	'should remove parentheses from keys': {
		test(): void {
			assert(GalladesAbilityTest.cachedData.hintKeys!.length);
			assert(!GalladesAbilityTest.cachedData.hintKeys!.includes("AO("));
		},
	},
};

export const game: IGameFile<GalladesAbilityTest> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['gallades', 'gat', 'abilitytest', 'tya'],
	category: 'knowledge-1',
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
		'pmtimeattack': {
			roundTime: 10 * 1000,
		},
	},
	modes: ["abridged", "collectiveteam", "multianswer", "pmtimeattack", "prolix", "spotlightteam", "survival", "timeattack"],
	tests: Object.assign({}, questionAndAnswerGame.tests, tests),
});
