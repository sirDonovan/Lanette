import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "splittersplatter";

const MIN_LETTERS = 3;

function getLetterPermutations(id: string): string[][] {
	return Tools.getPermutations(id.toUpperCase().split(""), 2, Math.min(id.length, 4), true);
}

class KyuremsSplits extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'splittersplatter': {name: "Splitter Splatter", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = KyuremsSplits.achievements.splittersplatter;

	// eslint-disable-next-line @typescript-eslint/require-await
	static async loadData(): Promise<void> {
		this.cachedData.categories = ["Characters", "Locations", "Pokemon", "Pokemon Abilities", "Pokemon Items", "Pokemon Moves"];

		const categoryHints: Dict<Dict<string[]>> = {
			"Characters": {},
			"Locations": {},
			"Pokemon": {},
			"Pokemon Abilities": {},
			"Pokemon Items": {},
			"Pokemon Moves": {},
		};
		const categoryHintKeys: Dict<string[]> = {
			"Characters": [],
			"Locations": [],
			"Pokemon": [],
			"Pokemon Abilities": [],
			"Pokemon Items": [],
			"Pokemon Moves": [],
		};

		for (const character of Dex.getCharacters()) {
			if (character.length < MIN_LETTERS) continue;

			const permutations = getLetterPermutations(Tools.toId(character));
			for (const permutation of permutations) {
				const key = permutation.join("");
				if (!(key in categoryHints.Characters)) {
					categoryHints.Characters[key] = [];
					categoryHintKeys.Characters.push(key);
				}
				if (!categoryHints.Characters[key].includes(character)) categoryHints.Characters[key].push(character);
			}
		}

		for (const location of Dex.getLocations()) {
			if (location.length < MIN_LETTERS) continue;

			const permutations = getLetterPermutations(Tools.toId(location));
			for (const permutation of permutations) {
				const key = permutation.join("");
				if (!(key in categoryHints.Locations)) {
					categoryHints.Locations[key] = [];
					categoryHintKeys.Locations.push(key);
				}
				if (!categoryHints.Locations[key].includes(location)) categoryHints.Locations[key].push(location);
			}
		}

		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.name.length < MIN_LETTERS) continue;

			const permutations = getLetterPermutations(pokemon.id);
			for (const permutation of permutations) {
				const key = permutation.join("");
				if (!(key in categoryHints.Pokemon)) {
					categoryHints.Pokemon[key] = [];
					categoryHintKeys.Pokemon.push(key);
				}
				if (!categoryHints.Pokemon[key].includes(pokemon.name)) categoryHints.Pokemon[key].push(pokemon.name);
			}
		}

		for (const ability of Games.getAbilitiesList()) {
			if (ability.name.length < MIN_LETTERS) continue;

			const permutations = getLetterPermutations(ability.id);
			for (const permutation of permutations) {
				const key = permutation.join("");
				if (!(key in categoryHints["Pokemon Abilities"])) {
					categoryHints["Pokemon Abilities"][key] = [];
					categoryHintKeys["Pokemon Abilities"].push(key);
				}
				if (!categoryHints["Pokemon Abilities"][key].includes(ability.name)) {
					categoryHints["Pokemon Abilities"][key].push(ability.name);
				}
			}
		}

		for (const item of Games.getItemsList()) {
			if (item.name.length < MIN_LETTERS) continue;

			const permutations = getLetterPermutations(item.id);
			for (const permutation of permutations) {
				const key = permutation.join("");
				if (!(key in categoryHints["Pokemon Items"])) {
					categoryHints["Pokemon Items"][key] = [];
					categoryHintKeys["Pokemon Items"].push(key);
				}
				if (!categoryHints["Pokemon Items"][key].includes(item.name)) categoryHints["Pokemon Items"][key].push(item.name);
			}
		}

		for (const move of Games.getMovesList()) {
			if (move.name.length < MIN_LETTERS) continue;

			const permutations = getLetterPermutations(move.id);
			for (const permutation of permutations) {
				const key = permutation.join("");
				if (!(key in categoryHints["Pokemon Moves"])) {
					categoryHints["Pokemon Moves"][key] = [];
					categoryHintKeys["Pokemon Moves"].push(key);
				}
				if (!categoryHints["Pokemon Moves"][key].includes(move.name)) categoryHints["Pokemon Moves"][key].push(move.name);
			}
		}

		this.cachedData.categoryHintAnswers = categoryHints;
		this.cachedData.categoryHintKeys = categoryHintKeys;
	}
}

export const game: IGameFile<KyuremsSplits> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['kyurems'],
	category: 'identification-1',
	class: KyuremsSplits,
	defaultOptions: ['points'],
	description: "Players guess answers that have all of the given letters in order!",
	formerNames: ["Splits"],
	freejoin: true,
	name: "Kyurem's Splits",
	mascot: "Kyurem",
	minigameCommand: 'split',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess an answer with all of the given letters in that " +
		"order!",
	modes: ["abridged", "collectiveteam", "multianswer", "pmtimeattack", "prolix", "spotlightteam", "survival", "timeattack"],
	nonTrivialLoadData: true,
	variants: [
		{
			name: "Kyurem's Ability Splits",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Kyurem's Character Splits",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Kyurem's Item Splits",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Kyurem's Location Splits",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Kyurem's Move Splits",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Kyurem's Pokemon Splits",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
