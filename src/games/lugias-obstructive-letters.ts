import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const BASE_POINTS = 50;
const BASE_TEAM_POINTS = 100;
const MIN_LETTERS = 6;
const LETTERS = Tools.letters.split("");

function getAvailableLetters(id: string): string {
	const availableLetters: string[] = [];
	for (const letter of LETTERS) {
		if (!id.includes(letter)) availableLetters.push(letter);
	}

	return availableLetters.join("");
}

class LugiasObstructiveLetters extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	loserPointsToBits: number = 2;
	roundTime: number = 30 * 1000;
	winnerPointsToBits: number = 10;

	static loadData(): void {
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

			const key = getAvailableLetters(Tools.toId(character));
			if (!(key in categoryHints["Characters"])) {
				categoryHints["Characters"][key] = [];
				categoryHintKeys["Characters"].push(key);
			}
			categoryHints["Characters"][key].push(character);
		}

		for (const location of Dex.getLocations()) {
			if (location.length < MIN_LETTERS) continue;

			const key = getAvailableLetters(Tools.toId(location));
			if (!(key in categoryHints["Locations"])) {
				categoryHints["Locations"][key] = [];
				categoryHintKeys["Locations"].push(key);
			}
			categoryHints["Locations"][key].push(location);
		}

		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.name.length < MIN_LETTERS) continue;

			const key = getAvailableLetters(pokemon.id);
			if (!(key in categoryHints["Pokemon"])) {
				categoryHints["Pokemon"][key] = [];
				categoryHintKeys["Pokemon"].push(key);
			}
			categoryHints["Pokemon"][key].push(pokemon.name);
		}

		for (const ability of Games.getAbilitiesList()) {
			if (ability.name.length < MIN_LETTERS) continue;

			const key = getAvailableLetters(ability.id);
			if (!(key in categoryHints["Pokemon Abilities"])) {
				categoryHints["Pokemon Abilities"][key] = [];
				categoryHintKeys["Pokemon Abilities"].push(key);
			}
			categoryHints["Pokemon Abilities"][key].push(ability.name);
		}

		for (const item of Games.getItemsList()) {
			if (item.name.length < MIN_LETTERS) continue;

			const key = getAvailableLetters(item.id);
			if (!(key in categoryHints["Pokemon Items"])) {
				categoryHints["Pokemon Items"][key] = [];
				categoryHintKeys["Pokemon Items"].push(key);
			}
			categoryHints["Pokemon Items"][key].push(item.name);
		}

		for (const move of Games.getMovesList()) {
			if (move.name.length < MIN_LETTERS) continue;

			const key = getAvailableLetters(move.id);
			if (!(key in categoryHints["Pokemon Moves"])) {
				categoryHints["Pokemon Moves"][key] = [];
				categoryHintKeys["Pokemon Moves"].push(key);
			}
			categoryHints["Pokemon Moves"][key].push(move.name);
		}

		this.cachedData.categoryHintAnswers = categoryHints;
		this.cachedData.categoryHintKeys = categoryHintKeys;
	}

	onSetGeneratedHint(hintKey: string): void {
		this.hint = "<b>" + this.currentCategory + "</b>: <i>" +
			this.sampleMany(hintKey.split(""), Math.floor(hintKey.length / 2)).sort().join(", ").toUpperCase() + "</i>";
	}

	getPointsForAnswer(answer: string): number {
		return Tools.toId(answer).length;
	}
}

export const game: IGameFile<LugiasObstructiveLetters> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['lugias', 'lol'],
	category: 'identification-1',
	class: LugiasObstructiveLetters,
	customizableOptions: {
		points: {min: BASE_POINTS, base: BASE_POINTS, max: BASE_POINTS},
		teamPoints: {min: BASE_TEAM_POINTS, base: BASE_TEAM_POINTS, max: BASE_TEAM_POINTS},
	},
	description: "Players guess answers that are missing the given letters! Answers must be at least 6 letters long.",
	freejoin: true,
	name: "Lugia's Obstructive Letters",
	mascot: "Lugia",
	minigameCommand: 'obstruction',
	modes: ["collectiveteam", "spotlightteam", "survival"],
});
