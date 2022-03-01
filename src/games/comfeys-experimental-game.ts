import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const upperCaseLetters: string[] = Tools.letters.toUpperCase().split("");
const lowerCaseLetters: string[] = Tools.letters.split("");

function getNextAndPreviousLetters(letter: string): [string] | null {
	let index = upperCaseLetters.indexOf(letter);
	if (index !== -1) {
		return [(upperCaseLetters[index].charCodeAt(0) - 64).toString()];
	} else {
		index = lowerCaseLetters.indexOf(letter);
		return [lowerCaseLetters[index]];
	}
}

function getOneAways(word: string): string[] | null {
	if (word.length < 3 || Tools.containsInteger(word)) return null;

	const letters = word.split("");
	const oneAways: [string[]] = [letters.slice()];
	for (let i = 0; i < letters.length; i++) {
		if (!letters[i]) continue;
		const letter = letters[i].toUpperCase();

		const nextAndPreviousLetters = getNextAndPreviousLetters(letter);
		if (!nextAndPreviousLetters) continue;

		oneAways[0][i] = nextAndPreviousLetters[0];
	}

	for (let i = letters.length - 1; i > 0; i--) {
		if (Number(oneAways[0][i]) > 0) {
			
		} else {
			oneAways[0].splice(i, 1);
		}
	}
	return [oneAways[0].join("-")];
}

class ComfeysExperimentalGame extends QuestionAndAnswer {
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

		this.cachedData.categoryHintKeys = categoryHintKeys;
		this.cachedData.categoryHintAnswers = categoryHints;
	}
}

export const game: IGameFile<ComfeysExperimentalGame> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['comfeys', 'experimentalgame', 'ceg'],
	category: 'identification-1',
	class: ComfeysExperimentalGame,
	defaultOptions: ['points'],
	description: "Experimental game (currently a clone of MOA).",
	freejoin: true,
	name: "Comfey's Experimental Game",
	mascot: "Comfey",
	minigameCommand: 'ceg',
	minigameDescription: "Experimental game (currently a clone of MOA).",
	modes: ["collectiveteam", "spotlightteam", "survival"],
	variants: [
		{
			name: "Comfey's Ability Experimental Game",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Comfey's Character Experimental Game",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Comfey's Item Experimental Game",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Comfey's Location Experimental Game",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Comfey's Move Experimental Game",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Comfey's Pokemon Experimental Game",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
