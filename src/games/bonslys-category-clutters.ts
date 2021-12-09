import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "genusgenius";

class BonslysCategoryClutters extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'genusgenius': {name: "Genus Genius", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = BonslysCategoryClutters.achievements.genusgenius;
	hintPrefix: string = "Bonsly imitated";

	static loadData(): void {
		this.cachedData.hintAnswers = {};
		const hintKeys: string[] = [];

		for (const pokemon of Games.getPokemonList()) {
			const category = Dex.getPokemonCategory(pokemon);
			if (!category) continue;
			this.cachedData.hintAnswers[pokemon.name] = [category];
			hintKeys.push(pokemon.name);
		}

		this.cachedData.hintKeys = hintKeys;
	}

	onSignups(): void {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
	}
}

export const game: IGameFile<BonslysCategoryClutters> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["bonslys", "bcc", "categoryclutters"],
	category: 'knowledge-2',
	class: BonslysCategoryClutters,
	defaultOptions: ['points'],
	description: "Players guess categories of randomly chosen Pokemon!",
	freejoin: true,
	name: "Bonsly's Category Clutters",
	mascot: "Bonsly",
	minigameCommand: 'bonslyclutter',
	minigameCommandAliases: ['bclutter'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the category of the given Pokemon!",
	modes: ["collectiveteam", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
});
