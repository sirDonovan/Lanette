import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const upperCaseLetters: string[] = Tools.letters.toUpperCase().split("");
const lowerCaseLetters: string[] = Tools.letters.split("");

function getEncodedLetters(letter: string): [string] | null {
	let index = upperCaseLetters.indexOf(letter);
	if (index !== -1) {
		return [(upperCaseLetters[index].charCodeAt(0) - 64).toString()];
	} else {
		index = lowerCaseLetters.indexOf(letter);
		return [lowerCaseLetters[index]];
	}
}

function getEncode(word: string): string[] | null {
	if (word.length < 3 || Tools.containsInteger(word)) return null;

	const letters = word.split("");
	const encodes: [string[]] = [letters.slice()];
	for (let i = 0; i < letters.length; i++) {
		if (!letters[i]) continue;
		const letter = letters[i].toUpperCase();

		const nextAndPreviousLetters = getEncodedLetters(letter);
		if (!nextAndPreviousLetters) continue;

		encodes[0][i] = nextAndPreviousLetters[0];
	}

	for (let i = letters.length - 1; i > 0; i--) {
		if (isNaN(parseInt(encodes[0][i]))) {
			encodes[0].splice(i, 1);
		}
	}
	return [encodes[0].join("-")];
}

class ElgyemsNumberEncoder extends QuestionAndAnswer {
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

		const characters = Dex.getCharacters();
		for (const character of characters) {
			const encodes = getEncode(character);
			if (!encodes) continue;
			for (const encode of encodes) {
				if (!(encode in categoryHints["Characters"])) {
					categoryHints["Characters"][encode] = [];
					categoryHintKeys["Characters"].push(encode);
				}
				categoryHints["Characters"][encode].push(character);
			}
		}

		const locations = Dex.getLocations();
		for (const location of locations) {
			const encodes = getEncode(location);
			if (!encodes) continue;
			for (const encode of encodes) {
				if (!(encode in categoryHints["Locations"])) {
					categoryHints["Locations"][encode] = [];
					categoryHintKeys["Locations"].push(encode);
				}
				categoryHints["Locations"][encode].push(location);
			}
		}

		for (const pokemon of Games.getPokemonList()) {
			const encodes = getEncode(pokemon.name);
			if (!encodes) continue;
			for (const encode of encodes) {
				if (!(encode in categoryHints["Pokemon"])) {
					categoryHints["Pokemon"][encode] = [];
					categoryHintKeys["Pokemon"].push(encode);
				}
				categoryHints["Pokemon"][encode].push(pokemon.name);
			}
		}

		for (const ability of Games.getAbilitiesList()) {
			const encodes = getEncode(ability.name);
			if (!encodes) continue;
			for (const encode of encodes) {
				if (!(encode in categoryHints["Pokemon Abilities"])) {
					categoryHints["Pokemon Abilities"][encode] = [];
					categoryHintKeys["Pokemon Abilities"].push(encode);
				}
				categoryHints["Pokemon Abilities"][encode].push(ability.name);
			}
		}

		for (const item of Games.getItemsList()) {
			const encodes = getEncode(item.name);
			if (!encodes) continue;
			for (const encode of encodes) {
				if (!(encode in categoryHints["Pokemon Items"])) {
					categoryHints["Pokemon Items"][encode] = [];
					categoryHintKeys["Pokemon Items"].push(encode);
				}
				categoryHints["Pokemon Items"][encode].push(item.name);
			}
		}

		for (const move of Games.getMovesList()) {
			const encodes = getEncode(move.name);
			if (!encodes) continue;
			for (const encode of encodes) {
				if (!(encode in categoryHints["Pokemon Moves"])) {
					categoryHints["Pokemon Moves"][encode] = [];
					categoryHintKeys["Pokemon Moves"].push(encode);
				}
				categoryHints["Pokemon Moves"][encode].push(move.name);
			}
		}

		this.cachedData.categoryHintKeys = categoryHintKeys;
		this.cachedData.categoryHintAnswers = categoryHints;
	}
}

export const game: IGameFile<ElgyemsNumberEncoder> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['elgyems', 'numberencoder', 'ene'],
	category: 'identification-1',
	class: ElgyemsNumberEncoder,
	defaultOptions: ['points'],
	description: "Players guess answers that are encrypted in numbers (eg. 19-20-21-14-6-9-19-11 = Stunfisk)!",
	freejoin: true,
	name: "Elgyem's Number Encoder",
	mascot: "Elgyem",
	minigameCommand: 'numberencode',
	minigameCommandAliases: ['nencode'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess answers that are encrypted in numbers " +
		"(eg. 19-20-21-14-6-9-19-11 = Stunfisk)!",
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
