import type { Player } from "../room-activity";
import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

class ChimechosStatSchool extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	hintPrefix: string = "Randomly generated base stats";
	oneGuessPerHint = true;
	readonly roundGuesses = new Map<Player, boolean>();
    allowMisType = true;

	static loadData(): void {
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

    filterGuess(guess: string) {
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
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the Pokemon with the given base stats!",
	modes: ["collectiveteam", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
});
