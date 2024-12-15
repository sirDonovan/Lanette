import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "alphabetsweep";

const VOWELS: string[] = Tools.vowels.split("").concat(Tools.vowels.toUpperCase().split(""));

function getLostLetters(answer: string, inverse?: boolean): string | null {
	const lostLetters: string[] = [];
	for (const letter of answer.split('')) {
		if (letter === ' ') continue;
		if (inverse) {
			if (VOWELS.includes(letter)) {
				lostLetters.push(letter);
			}
		} else {
			if (!VOWELS.includes(letter)) {
				lostLetters.push(letter);
			}
		}
	}

	return lostLetters.join('');
}

class FeraligatrsLostLetters extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'alphabetsweep': {name: "Alphabet Sweep", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = FeraligatrsLostLetters.achievements.alphabetsweep;

	// eslint-disable-next-line @typescript-eslint/require-await
	static async loadData(): Promise<void> {
		this.cachedData.categories = ["Characters", "Locations", "Pokemon", "Pokemon Abilities", "Pokemon Items", "Pokemon Moves"];
		const inverseCategories = this.cachedData.categories.slice();
		inverseCategories.splice(inverseCategories.indexOf("Characters"), 1);
		this.cachedData.inverseCategories = inverseCategories;

		const categoryHintKeys: Dict<string[]> = {
			"Characters": [],
			"Locations": [],
			"Pokemon": [],
			"Pokemon Abilities": [],
			"Pokemon Items": [],
			"Pokemon Moves": [],
		};
		const categoryHints: Dict<Dict<string[]>> = {
			"Characters": {},
			"Locations": {},
			"Pokemon": {},
			"Pokemon Abilities": {},
			"Pokemon Items": {},
			"Pokemon Moves": {},
		};

		const inverseCategoryHintKeys = Tools.deepClone(categoryHintKeys);
		const inverseCategoryHints = Tools.deepClone(categoryHints);

		for (const character of Dex.getCharacters()) {
			const lostLetters = getLostLetters(character);
			if (lostLetters) {
				if (!(lostLetters in categoryHints.Characters)) {
					categoryHintKeys.Characters.push(lostLetters);
					categoryHints.Characters[lostLetters] = [];
				}
				categoryHints.Characters[lostLetters].push(character);
			}

			const inverseLostLetters = getLostLetters(character, true);
			if (inverseLostLetters) {
				if (!(inverseLostLetters in inverseCategoryHints.Characters)) {
					inverseCategoryHintKeys.Characters.push(inverseLostLetters);
					inverseCategoryHints.Characters[inverseLostLetters] = [];
				}
				inverseCategoryHints.Characters[inverseLostLetters].push(character);
			}
		}

		for (const location of Dex.getLocations()) {
			const lostLetters = getLostLetters(location);
			if (lostLetters) {
				if (!(lostLetters in categoryHints.Locations)) {
					categoryHintKeys.Locations.push(lostLetters);
					categoryHints.Locations[lostLetters] = [];
				}
				categoryHints.Locations[lostLetters].push(location);
			}

			const inverseLostLetters = getLostLetters(location, true);
			if (inverseLostLetters) {
				if (!(inverseLostLetters in inverseCategoryHints.Locations)) {
					inverseCategoryHintKeys.Locations.push(inverseLostLetters);
					inverseCategoryHints.Locations[inverseLostLetters] = [];
				}
				inverseCategoryHints.Locations[inverseLostLetters].push(location);
			}
		}

		for (const pokemon of Games.getPokemonList()) {
			const lostLetters = getLostLetters(pokemon.name);
			if (lostLetters) {
				if (!(lostLetters in categoryHints.Pokemon)) {
					categoryHintKeys.Pokemon.push(lostLetters);
					categoryHints.Pokemon[lostLetters] = [];
				}
				categoryHints.Pokemon[lostLetters].push(pokemon.name);
			}

			const inverseLostLetters = getLostLetters(pokemon.name, true);
			if (inverseLostLetters) {
				if (!(inverseLostLetters in inverseCategoryHints.Pokemon)) {
					inverseCategoryHintKeys.Pokemon.push(inverseLostLetters);
					inverseCategoryHints.Pokemon[inverseLostLetters] = [];
				}
				inverseCategoryHints.Pokemon[inverseLostLetters].push(pokemon.name);
			}
		}

		for (const ability of Games.getAbilitiesList()) {
			const lostLetters = getLostLetters(ability.name);
			if (lostLetters) {
				if (!(lostLetters in categoryHints["Pokemon Abilities"])) {
					categoryHintKeys["Pokemon Abilities"].push(lostLetters);
					categoryHints["Pokemon Abilities"][lostLetters] = [];
				}
				categoryHints["Pokemon Abilities"][lostLetters].push(ability.name);
			}

			const inverseLostLetters = getLostLetters(ability.name, true);
			if (inverseLostLetters) {
				if (!(inverseLostLetters in inverseCategoryHints["Pokemon Abilities"])) {
					inverseCategoryHintKeys["Pokemon Abilities"].push(inverseLostLetters);
					inverseCategoryHints["Pokemon Abilities"][inverseLostLetters] = [];
				}
				inverseCategoryHints["Pokemon Abilities"][inverseLostLetters].push(ability.name);
			}
		}

		for (const item of Games.getItemsList()) {
			const lostLetters = getLostLetters(item.name);
			if (lostLetters) {
				if (!(lostLetters in categoryHints["Pokemon Items"])) {
					categoryHintKeys["Pokemon Items"].push(lostLetters);
					categoryHints["Pokemon Items"][lostLetters] = [];
				}
				categoryHints["Pokemon Items"][lostLetters].push(item.name);
			}

			const inverseLostLetters = getLostLetters(item.name, true);
			if (inverseLostLetters) {
				if (!(inverseLostLetters in inverseCategoryHints["Pokemon Items"])) {
					inverseCategoryHintKeys["Pokemon Items"].push(inverseLostLetters);
					inverseCategoryHints["Pokemon Items"][inverseLostLetters] = [];
				}
				inverseCategoryHints["Pokemon Items"][inverseLostLetters].push(item.name);
			}
		}

		for (const move of Games.getMovesList()) {
			const lostLetters = getLostLetters(move.name);
			if (lostLetters) {
				if (!(lostLetters in categoryHints["Pokemon Moves"])) {
					categoryHintKeys["Pokemon Moves"].push(lostLetters);
					categoryHints["Pokemon Moves"][lostLetters] = [];
				}
				categoryHints["Pokemon Moves"][lostLetters].push(move.name);
			}

			const inverseLostLetters = getLostLetters(move.name, true);
			if (inverseLostLetters) {
				if (!(inverseLostLetters in inverseCategoryHints["Pokemon Moves"])) {
					inverseCategoryHintKeys["Pokemon Moves"].push(inverseLostLetters);
					inverseCategoryHints["Pokemon Moves"][inverseLostLetters] = [];
				}
				inverseCategoryHints["Pokemon Moves"][inverseLostLetters].push(move.name);
			}
		}

		this.cachedData.categoryHintKeys = categoryHintKeys;
		this.cachedData.categoryHintAnswers = categoryHints;
		this.cachedData.inverseCategoryHintKeys = inverseCategoryHintKeys;
		this.cachedData.inverseCategoryHintAnswers = inverseCategoryHints;
	}

	getMinigameDescription(): string {
		return "Use <code>" + Config.commandCharacter + "g</code> to guess the answer after finding the missing " +
			(this.inverse ? "consonants" : "vowels") + "!";
	}

	async onSignups(): Promise<void> {
		await super.onSignups();
		if (this.inverse) {
			this.roundTime = 15 * 1000;
		}
	}
}

export const game: IGameFile<FeraligatrsLostLetters> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['feraligatrs', 'fll', 'll'],
	category: 'identification-1',
	class: FeraligatrsLostLetters,
	defaultOptions: ['points'],
	description: "Players guess the missing vowels to find the answers!",
	formerNames: ["Lost Letters"],
	freejoin: true,
	name: "Feraligatr's Lost Letters",
	mascot: "Feraligatr",
	minigameCommand: 'lostletter',
	minigameCommandAliases: ['lletter'],
	modes: ["collectiveteam", "pmtimeattack", "spotlightteam", "timeattack"],
	variants: [
		{
			name: "Feraligatr's Ability Lost Letters",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Feraligatr's Character Lost Letters",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Feraligatr's Inverse Lost Letters",
			description: "Players guess the missing consonants to find the answers!",
			inverse: true,
			variantAliases: ['inverse'],
		},
		{
			name: "Feraligatr's Item Lost Letters",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Feraligatr's Location Lost Letters",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Feraligatr's Move Lost Letters",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Feraligatr's Pokemon Lost Letters",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
