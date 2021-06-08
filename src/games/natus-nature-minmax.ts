import type { IGameFile } from "../types/games";
import type { INature, StatID } from "../types/pokemon-showdown";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const data: {natureAnswers: Dict<string[]>; statsKeys: Dict<string>, pokedex: string[]} = {
	"natureAnswers": {},
	"statsKeys": {},
	"pokedex": [],
};

class NatusNatureMinMax extends QuestionAndAnswer {
	lastStatsKey: string = '';
	lastPokemon: string = '';
	roundTime: number = 30 * 1000;

	static loadData(): void {
		const pokedex = Games.getPokemonList(pokemon => {
			if (pokemon.baseStats.hp === pokemon.baseStats.atk && pokemon.baseStats.atk === pokemon.baseStats.def &&
				pokemon.baseStats.def === pokemon.baseStats.spa && pokemon.baseStats.spa === pokemon.baseStats.spd &&
				pokemon.baseStats.spd === pokemon.baseStats.spe) return false;
			return true;
		});

		const natures: INature[] = [];
		for (const key of Dex.getData().natureKeys) {
			natures.push(Dex.getExistingNature(key));
		}

		for (const pokemon of pokedex) {
			const statKeys = Object.keys(pokemon.baseStats) as StatID[];
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
								combinationCache[combinationKey].push(nature.name);
							}
						}
					}

					highestLowestCache[dataKey] = highestLowestCache[dataKey].concat(combinationCache[combinationKey]);
				}
			}

			if (!highestLowestCache[dataKey].length) continue;

			data.statsKeys[pokemon.id] = dataKey;
			data.natureAnswers[dataKey] = highestLowestCache[dataKey];
			data.pokedex.push(pokemon.id);
		}
	}

	generateAnswer(): void {
		let pokemon = this.sampleOne(data.pokedex);
		let statsKey = data.statsKeys[pokemon];
		while (pokemon === this.lastPokemon || statsKey === this.lastStatsKey) {
			pokemon = this.sampleOne(data.pokedex);
			statsKey = data.statsKeys[pokemon];
		}
		this.lastPokemon = pokemon;
		this.lastStatsKey = statsKey;

		this.answers = data.natureAnswers[statsKey];
		this.hint = "<b>Randomly generated Pokemon</b>: <i>" + Dex.getExistingPokemon(pokemon).name + "</i>";
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
});
