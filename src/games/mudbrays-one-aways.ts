import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const upperCaseLetters: readonly string[] = Tools.lettersArray.map(x => x.toUpperCase());
const lowerCaseLetters: readonly string[] = Tools.lettersArray;

function getNextAndPreviousLetters(letter: string): [string, string] | null {
	let index = upperCaseLetters.indexOf(letter);
	if (index !== -1) {
		if (index === 0) return ["B", "Z"];
		if (index === 25) return ["A", "Y"];
		return [upperCaseLetters[index + 1], upperCaseLetters[index - 1]];
	} else {
		index = lowerCaseLetters.indexOf(letter);
		if (index === -1) return null;

		if (index === 0) return ["b", "z"];
		if (index === 25) return ["a", "y"];
		return [lowerCaseLetters[index + 1], lowerCaseLetters[index - 1]];
	}
}

function getOneAways(word: string): string[] | null {
	if (word.length < 3 || Tools.containsInteger(word)) return null;

	const letters = word.split("");
	const oneAways: [string[], string[]] = [letters.slice(), letters.slice()];
	for (let i = 0; i < letters.length; i++) {
		if (!letters[i]) continue;
		const letter = letters[i];

		const nextAndPreviousLetters = getNextAndPreviousLetters(letter);
		if (!nextAndPreviousLetters) continue;

		oneAways[0][i] = nextAndPreviousLetters[0];
		oneAways[1][i] = nextAndPreviousLetters[1];
	}

	return [oneAways[0].join(""), oneAways[1].join("")];
}

class MudbraysOneAways extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	roundTime: number = 30 * 1000;

	static loadData(): void {
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
			const oneAways = getOneAways(character);
			if (!oneAways) continue;
			for (const oneAway of oneAways) {
				if (!(oneAway in categoryHints["Characters"])) {
					categoryHints["Characters"][oneAway] = [];
					categoryHintKeys["Characters"].push(oneAway);
				}
				categoryHints["Characters"][oneAway].push(character);
			}
		}

		const locations = Dex.getLocations();
		for (const location of locations) {
			const oneAways = getOneAways(location);
			if (!oneAways) continue;
			for (const oneAway of oneAways) {
				if (!(oneAway in categoryHints["Locations"])) {
					categoryHints["Locations"][oneAway] = [];
					categoryHintKeys["Locations"].push(oneAway);
				}
				categoryHints["Locations"][oneAway].push(location);
			}
		}

		for (const pokemon of Games.getPokemonList()) {
			const oneAways = getOneAways(pokemon.name);
			if (!oneAways) continue;
			for (const oneAway of oneAways) {
				if (!(oneAway in categoryHints["Pokemon"])) {
					categoryHints["Pokemon"][oneAway] = [];
					categoryHintKeys["Pokemon"].push(oneAway);
				}
				categoryHints["Pokemon"][oneAway].push(pokemon.name);
			}
		}

		for (const ability of Games.getAbilitiesList()) {
			const oneAways = getOneAways(ability.name);
			if (!oneAways) continue;
			for (const oneAway of oneAways) {
				if (!(oneAway in categoryHints["Pokemon Abilities"])) {
					categoryHints["Pokemon Abilities"][oneAway] = [];
					categoryHintKeys["Pokemon Abilities"].push(oneAway);
				}
				categoryHints["Pokemon Abilities"][oneAway].push(ability.name);
			}
		}

		for (const item of Games.getItemsList()) {
			const oneAways = getOneAways(item.name);
			if (!oneAways) continue;
			for (const oneAway of oneAways) {
				if (!(oneAway in categoryHints["Pokemon Items"])) {
					categoryHints["Pokemon Items"][oneAway] = [];
					categoryHintKeys["Pokemon Items"].push(oneAway);
				}
				categoryHints["Pokemon Items"][oneAway].push(item.name);
			}
		}

		for (const move of Games.getMovesList()) {
			const oneAways = getOneAways(move.name);
			if (!oneAways) continue;
			for (const oneAway of oneAways) {
				if (!(oneAway in categoryHints["Pokemon Moves"])) {
					categoryHints["Pokemon Moves"][oneAway] = [];
					categoryHintKeys["Pokemon Moves"].push(oneAway);
				}
				categoryHints["Pokemon Moves"][oneAway].push(move.name);
			}
		}
		/* eslint-enable */

		this.cachedData.categoryHintKeys = categoryHintKeys;
		this.cachedData.categoryHintAnswers = categoryHints;
	}
}

export const game: IGameFile<MudbraysOneAways> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['mudbrays', 'oneaways', 'moa'],
	category: 'identification-1',
	class: MudbraysOneAways,
	defaultOptions: ['points'],
	description: "Players change all letters in the word to either the next or previous letter of the alphabet to find the answer " +
		"(e.g. Nvecsbz = Mudbray or Ltcaqzx = Mudbray)!",
	freejoin: true,
	name: "Mudbray's One Aways",
	mascot: "Mudbray",
	minigameCommand: 'oneaway',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the answer after changing all letters in the word " +
		"to either the next or previous letter of the alphabet (e.g. Nvecsbz = Mudbray or Ltcaqzx = Mudbray)!",
	modes: ["collectiveteam", "spotlightteam", "survival"],
	variants: [
		{
			name: "Mudbray's Ability One Aways",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Mudbray's Character One Aways",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Mudbray's Item One Aways",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Mudbray's Location One Aways",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Mudbray's Move One Aways",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Mudbray's Pokemon One Aways",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
