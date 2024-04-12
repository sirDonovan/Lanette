import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "genusgenius";

class SudowoodosSpeciesScramble extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'genusgenius': {name: "Genus Genius", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = SudowoodosSpeciesScramble.achievements.genusgenius;
	hintPrefix: string = "Sudowoodo imitated";

	static async loadData(): Promise<void> { // eslint-disable-line @typescript-eslint/require-await
		const hints: Dict<string[]> = {};
		const hintKeys: string[] = [];

		for (const pokemon of Games.getPokemonList()) {
			const category = Dex.getPokemonCategory(pokemon);
			if (!category) continue;

			const hintKey = "the " + category + " Pokemon";
			if (!(hintKey in hints)) {
				hints[hintKey] = [];
				hintKeys.push(hintKey);
			}
			hints[hintKey].push(pokemon.name);
		}

		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
	}
}

export const game: IGameFile<SudowoodosSpeciesScramble> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["sudowoodos", "sss", "speciesscramble"],
	category: 'knowledge-2',
	class: SudowoodosSpeciesScramble,
	defaultOptions: ['points'],
	description: "Players guess Pokemon based on the given categories!",
	freejoin: true,
	name: "Sudowoodo's Species Scramble",
	mascot: "Sudowoodo",
	minigameCommand: 'sudowoodospecies',
	minigameCommandAliases: ['sspecies'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a Pokemon based on the given category!",
	modes: ["collectiveteam", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
});
