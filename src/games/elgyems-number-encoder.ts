import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const upperCaseLetters = Tools.letters.toUpperCase();

function getEncodedWord(word: string): string | null {
	if (word.length < 3 || Tools.containsInteger(word)) return null;

	const letters = word.split("");
	const encoded: number[] = [];
	for (const letter of letters) {
		if (!letter) continue;
		const upperCaseLetter = letter.toUpperCase();
		if (upperCaseLetters.includes(upperCaseLetter)) {
			encoded.push(upperCaseLetter.charCodeAt(0) - 64);
		}
	}

	return encoded.join("-");
}

type AchievementNames = "codebreaker" | "captaincodebreaker";

class ElgyemsNumberEncoder extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"codebreaker": {name: "Codebreaker", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
		"captaincodebreaker": {name: "Captain Codebreaker", type: 'all-answers-team', bits: 1000, mode: 'collectiveteam', 
			description: "get every answer for your team and win the game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = ElgyemsNumberEncoder.achievements.codebreaker;
	allAnswersTeamAchievement = ElgyemsNumberEncoder.achievements.captaincodebreaker;
	roundTime: number = 30 * 1000;

	static async loadData(): Promise<void> { // eslint-disable-line @typescript-eslint/require-await
		this.cachedData.categories = ["Characters", "Locations", "Pokemon", "Pokemon Abilities", "Pokemon Items", "Pokemon Moves"];
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

		/* eslint-disable @typescript-eslint/dot-notation */
		const characters = Dex.getCharacters();
		for (const character of characters) {
			const encodedWord = getEncodedWord(character);
			if (!encodedWord) continue;
			if (!(encodedWord in categoryHints["Characters"])) {
				categoryHints["Characters"][encodedWord] = [];
				categoryHintKeys["Characters"].push(encodedWord);
			}
			categoryHints["Characters"][encodedWord].push(character);
		}

		const locations = Dex.getLocations();
		for (const location of locations) {
			const encodedWord = getEncodedWord(location);
			if (!encodedWord) continue;
			if (!(encodedWord in categoryHints["Locations"])) {
				categoryHints["Locations"][encodedWord] = [];
				categoryHintKeys["Locations"].push(encodedWord);
			}
			categoryHints["Locations"][encodedWord].push(location);
		}

		for (const pokemon of Games.getPokemonList()) {
			const encodedWord = getEncodedWord(pokemon.name);
			if (!encodedWord) continue;
			if (!(encodedWord in categoryHints["Pokemon"])) {
				categoryHints["Pokemon"][encodedWord] = [];
				categoryHintKeys["Pokemon"].push(encodedWord);
			}
			categoryHints["Pokemon"][encodedWord].push(pokemon.name);
		}

		for (const ability of Games.getAbilitiesList()) {
			const encodedWord = getEncodedWord(ability.name);
			if (!encodedWord) continue;
			if (!(encodedWord in categoryHints["Pokemon Abilities"])) {
				categoryHints["Pokemon Abilities"][encodedWord] = [];
				categoryHintKeys["Pokemon Abilities"].push(encodedWord);
			}
			categoryHints["Pokemon Abilities"][encodedWord].push(ability.name);
		}

		for (const item of Games.getItemsList()) {
			const encodedWord = getEncodedWord(item.name);
			if (!encodedWord) continue;
			if (!(encodedWord in categoryHints["Pokemon Items"])) {
				categoryHints["Pokemon Items"][encodedWord] = [];
				categoryHintKeys["Pokemon Items"].push(encodedWord);
			}
			categoryHints["Pokemon Items"][encodedWord].push(item.name);
		}

		for (const move of Games.getMovesList()) {
			const encodedWord = getEncodedWord(move.name);
			if (!encodedWord) continue;
			if (!(encodedWord in categoryHints["Pokemon Moves"])) {
				categoryHints["Pokemon Moves"][encodedWord] = [];
				categoryHintKeys["Pokemon Moves"].push(encodedWord);
			}
			categoryHints["Pokemon Moves"][encodedWord].push(move.name);
		}
		/* eslint-enable */

		this.cachedData.categoryHintKeys = categoryHintKeys;
		this.cachedData.categoryHintAnswers = categoryHints;
	}
}

export const game: IGameFile<ElgyemsNumberEncoder> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['elgyems', 'numberencoder', 'ene'],
	category: 'identification-1',
	class: ElgyemsNumberEncoder,
	defaultOptions: ['points'],
	description: "Players guess answers that are encoded in numbers (e.g. 19-20-21-14-6-9-19-11 = Stunfisk)!",
	freejoin: true,
	name: "Elgyem's Number Encoder",
	mascot: "Elgyem",
	minigameCommand: 'numberencode',
	minigameCommandAliases: ['nencode'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the answer that is encoded in numbers " +
		"(e.g. 19-20-21-14-6-9-19-11 = Stunfisk)!",
	modes: ["collectiveteam", "spotlightteam", "survival"],
	variants: [
		{
			name: "Elgyem's Ability Number Encoder",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Elgyem's Character Number Encoder",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Elgyem's Item Number Encoder",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Elgyem's Location Number Encoder",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Elgyem's Move Number Encoder",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Elgyem's Pokemon Number Encoder",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
