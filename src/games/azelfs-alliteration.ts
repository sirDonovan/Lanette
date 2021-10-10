import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

class AzelfsAlliteration extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	currentCategory: string = '';

	static loadData(): void {
		const categories: string[] = [];
		const categoryHints: Dict<Dict<string[]>> = {};
		const categoryHintKeys: Dict<string[]> = {};

		// ability/item/move -> letter -> answers
		const abilityKey = "an ability";
		categories.push(abilityKey);
		categoryHints[abilityKey] = {};
		categoryHintKeys[abilityKey] = [];

		for (const ability of Games.getAbilitiesList()) {
			const letter = ability.id.charAt(0);
			if (!(letter in categoryHints[abilityKey])) {
				categoryHints[abilityKey][letter] = [];
				categoryHintKeys[abilityKey].push(letter);
			}

			categoryHints[abilityKey][letter].push(ability.name);
		}

		const itemKey = "an item";
		categories.push(itemKey);
		categoryHints[itemKey] = {};
		categoryHintKeys[itemKey] = [];

		for (const item of Games.getItemsList()) {
			const letter = item.id.charAt(0);
			if (!(letter in categoryHints[itemKey])) {
				categoryHints[itemKey][letter] = [];
				categoryHintKeys[itemKey].push(letter);
			}

			categoryHints[itemKey][letter].push(item.name);
		}

		for (const move of Games.getMovesList()) {
			const letter = move.id.charAt(0);
			const key = (Tools.vowels.includes(move.type.charAt(0).toLowerCase()) ? "an" : "a") + " " + move.type + " move";
			if (!(key in categoryHints)) {
				categories.push(key);
				categoryHints[key] = {};
				categoryHintKeys[key] = [];
			}

			if (!(letter in categoryHints[key])) {
				categoryHints[key][letter] = [];
				categoryHintKeys[key].push(letter);
			}

			categoryHints[key][letter].push(move.name);
		}

		this.cachedData.hintKeys = Games.getPokemonList().map(x => x.name);
		this.cachedData.categories = categories;
		this.cachedData.categoryHintAnswers = categoryHints;
		this.cachedData.categoryHintKeys = categoryHintKeys;
	}

	onSetGeneratedHint(baseHintKey: string, hintAnswers: Dict<readonly string[]>): string {
		let pokemon = this.sampleOne(AzelfsAlliteration.cachedData.hintKeys!);
		let letter = pokemon.charAt(0).toLowerCase();
		while (!(letter in hintAnswers) || !hintAnswers[letter].length) {
			pokemon = this.sampleOne(AzelfsAlliteration.cachedData.hintKeys!);
			letter = pokemon.charAt(0).toLowerCase();
		}

		this.answers = hintAnswers[letter];
		const hintKey = pokemon + " - " + this.currentCategory;
		this.hint = "<b>Randomly generated Pokemon and category</b>: <i>" + hintKey + "</i>";
		return hintKey;
	}
}

export const game: IGameFile<AzelfsAlliteration> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['azelfs', 'aa'],
	category: 'knowledge-2',
	class: AzelfsAlliteration,
	defaultOptions: ['points'],
	description: "Players guess abilities, items, or moves based on the given Pokemon's name!",
	freejoin: true,
	name: "Azelf's Alliteration",
	mascot: "Azelf",
	minigameCommand: "azelfalliteration",
	minigameCommandAliases: ["aalliteration"],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess an ability, item, or move based on the given " +
		"Pokemon's name!",
	modes: ["abridged", "collectiveteam", "multianswer", "pmtimeattack", "prolix", "spotlightteam", "survival", "timeattack"],
	nonTrivialLoadData: true,
});
