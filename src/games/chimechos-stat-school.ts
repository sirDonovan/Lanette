import type { Player } from "../room-activity";
import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "firststatesman" | "firstcaptainstatesman";

class ChimechosStatSchool extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"firststatesman": {name: "First Statesman", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
		"firstcaptainstatesman": {name: "First Captain Statesman", type: 'all-answers-team', bits: 1000, mode: 'collectiveteam', 
			description: "get every answer for your team and win the game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = ChimechosStatSchool.achievements.firststatesman;
	allAnswersTeamAchievement = ChimechosStatSchool.achievements.firstcaptainstatesman;

	hintPrefix: string = "Randomly generated base stats";
	oneGuessPerHint = true;
	readonly roundGuesses = new Map<Player, boolean>();
    allowMisType = true;

	static async loadData(): Promise<void> { // eslint-disable-line @typescript-eslint/require-await
		const statSpreads: Dict<string[]> = {};
		for (const pokemon of Games.getPokemonList()) {
			const statSpread = Object.values(pokemon.baseStats).join(" / ");
			if (!(statSpread in statSpreads)) {
				statSpreads[statSpread] = [];
			}
			statSpreads[statSpread].push(pokemon.name);
		}

		this.cachedData.hintAnswers = {};
		const hintKeys: string[] = [];

		for (const i in statSpreads) {
			if (statSpreads[i].length === 1) {
				this.cachedData.hintAnswers[i] = statSpreads[i];
				hintKeys.push(i);
			}
		}

		this.cachedData.hintKeys = hintKeys;
	}

    filterGuess(guess: string): boolean {
        return !Dex.getPokemon(guess);
    }
}

export const game: IGameFile<ChimechosStatSchool> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['chimechos', 'css', 'statschool'],
	category: 'knowledge-3',
	class: ChimechosStatSchool,
	defaultOptions: ['points'],
	description: "Players guess Pokemon based on random base stats!",
	freejoin: true,
	name: "Chimecho's Stat School",
	mascot: "Chimecho",
	minigameCommand: 'statschool',
	minigameCommandAliases: ['sschool'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the Pokemon with the given base stats (one chance " +
		"to guess correctly)!",
	modes: ["collectiveteam", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
});
