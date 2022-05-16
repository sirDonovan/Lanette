import type { Player } from "../room-activity";
import type { IGameCachedData, IGameFile } from "../types/games";
import type { INature, StatID } from "../types/pokemon-showdown";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

class XatusNatureClusters extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	hintPrefix: string = "Randomly generated Nature";
	oneGuessPerHint = true;
	roundTime: number = 20 * 1000;
	readonly roundGuesses = new Map<Player, boolean>();

	static loadData(): void {
		const hints: Dict<string[]> = {};
		const hintKeys: string[] = [];

		const natures: INature[] = [];
		for (const key of Dex.getData().natureKeys) {
			natures.push(Dex.getExistingNature(key));
		}
        for (const nature of natures){
            if (nature.plus && nature.minus){
                hintKeys.push(nature.name);
                hints[nature.name] = [];
            }
        }

		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.baseStats.hp === pokemon.baseStats.atk && pokemon.baseStats.atk === pokemon.baseStats.def &&
				pokemon.baseStats.def === pokemon.baseStats.spa && pokemon.baseStats.spa === pokemon.baseStats.spd &&
				pokemon.baseStats.spd === pokemon.baseStats.spe) continue;

			const statKeys = ['atk','def','spa','spd','spe'] as StatID[];
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

			const highestLowestCache: Dict<string[]> = {};
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
                                hints[nature.name].push(pokemon.name);
								combinationCache[combinationKey].push(nature.name);
							}
						}
					}

					highestLowestCache[dataKey] = highestLowestCache[dataKey].concat(combinationCache[combinationKey]);
				}
			}

			if (!highestLowestCache[dataKey].length) continue;

		}

		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
	}
}

export const game: IGameFile<XatusNatureClusters> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['xnc', 'xatus', 'naturecluster'],
	category: 'knowledge-2',
	class: XatusNatureClusters,
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	defaultOptions: ['points'],
	description: "Players guess Pokemon that get +10% to the highest stat and -10% to the lowest stat for each generated Nature!",
	freejoin: true,
	name: "Xatu's Nature Clusters",
	mascot: "Xatu",
	minigameCommand: 'naturecluster',
	minigameCommandAliases: ['ncluster'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a Pokemon that gets +10% to the highest stat " +
		"and -10% to the lowest stat for the generated Nature!",
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
});
