import type { Player } from "../room-activity";
import type { IGameCachedData, IGameFile } from "../types/games";
import type { INature, StatIDExceptHP } from "../types/pokemon-showdown";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

class NatusNatureMinMax extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	hintPrefix: string = "Randomly generated Pokemon";
	oneGuessPerHint = true;
	roundTime: number = 30 * 1000;
	readonly roundGuesses = new Map<Player, boolean>();
    allowMisType = true;

	static loadData(): void {
		const hints: Dict<string[]> = {};
		const hintKeys: string[] = [];

		const natures: INature[] = [];
		for (const key of Dex.getData().natureKeys) {
			const nature = Dex.getExistingNature(key);
			if (nature.plus && nature.minus) {
				natures.push(nature);
			}
		}

		const highestLowestCache: Dict<string[]> = {};
		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.baseStats.hp === pokemon.baseStats.atk && pokemon.baseStats.atk === pokemon.baseStats.def &&
				pokemon.baseStats.def === pokemon.baseStats.spa && pokemon.baseStats.spa === pokemon.baseStats.spd &&
				pokemon.baseStats.spd === pokemon.baseStats.spe) continue;

			const statKeys: StatIDExceptHP[] = ['atk', 'def', 'spa', 'spd', 'spe'];
			statKeys.sort((a, b) => pokemon.baseStats[b] - pokemon.baseStats[a]);

			const highestStat = statKeys[0];
			const lowestStat = statKeys[statKeys.length - 1];

			const highestStats = [highestStat];
			const lowestStats = [lowestStat];

			for (let i = 1, len = statKeys.length - 1; i < len; i++) {
				const stat = statKeys[i];
				if (pokemon.baseStats[stat] === pokemon.baseStats[highestStat]) {
					highestStats.push(stat);
				} else if (pokemon.baseStats[stat] === pokemon.baseStats[lowestStat]) {
					lowestStats.push(stat);
				}
			}

			const combinationCache: Dict<string[]> = {};
			const dataKey = highestStats.join(',') + "|" + lowestStats.join(',');
			if (!(dataKey in highestLowestCache)) {
				highestLowestCache[dataKey] = [];

				const permutations = Tools.getPermutations(highestStats.concat(lowestStats), 2, 2);
				for (const permutation of permutations) {
					const combinationKey = permutation.join(",");
					if (!(combinationKey in combinationCache)) {
						combinationCache[combinationKey] = [];

						if (!highestStats.includes(permutation[0]) || !lowestStats.includes(permutation[1])) continue;

						for (const nature of natures) {
							if (nature.plus === permutation[0] && nature.minus === permutation[1]) {
								combinationCache[combinationKey].push(nature.name);
							}
						}
					}

					highestLowestCache[dataKey] = highestLowestCache[dataKey].concat(combinationCache[combinationKey]);
				}
			}

			if (!highestLowestCache[dataKey].length) continue;

			hints[pokemon.name] = highestLowestCache[dataKey];
			hintKeys.push(pokemon.name);
		}

		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
	}

    filterGuess(guess: string) {
        return !Dex.getNature(guess);
    }
}

export const game: IGameFile<NatusNatureMinMax> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['nnm', 'natus', 'natureminmax'],
	category: 'knowledge-2',
	class: NatusNatureMinMax,
	commandDescriptions: [Config.commandCharacter + "g [nature]"],
	defaultOptions: ['points'],
	description: "Players guess natures that give +10% to the highest stat and -10% to the lowest stat for each generated Pokemon!",
	freejoin: true,
	name: "Natu's Nature Min-Max",
	mascot: "Natu",
	minigameCommand: 'natureminmax',
	minigameCommandAliases: ['nminmax'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a nature that gives +10% to the highest stat " +
		"and -10% to the lowest stat for the generated Pokemon!",
	modes: ["collectiveteam", "multianswer", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
	modeProperties: {
		'survival': {
			roundTime: 15 * 1000,
		},
		'timeattack': {
			roundTime: 15 * 1000,
		},
		'pmtimeattack': {
			roundTime: 15 * 1000,
		},
	},
	variants: [
		{
			name: "Natu's Nature Min-Max (GIFs)",
			variantAliases: ["gif", "gifs"],
			pokemonGifHints: true,
		},
	],
});
