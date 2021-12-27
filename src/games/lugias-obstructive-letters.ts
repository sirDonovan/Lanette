import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const BASE_POINTS = 50;
const BASE_TEAM_POINTS = 100;
const MIN_LETTERS = 6;
const MAX_ANSWERS = 20;
const LETTERS = Tools.letters.split("");

function getAvailableLetters(id: string): string[] {
	const availableLetters: string[] = [];
	for (const letter of LETTERS) {
		if (!id.includes(letter)) availableLetters.push(letter);
	}

	return availableLetters;
}

class LugiasObstructiveLetters extends QuestionAndAnswer {
	static availableLetters: Dict<string[]> = {};
	static cachedData: IGameCachedData = {};

	currentCategory: string = '';
	loserPointsToBits: number = 2;
	roundTime: number = 30 * 1000;
	winnerPointsToBits: number = 10;

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

		for (const character of Dex.getCharacters()) {
			if (character.length < MIN_LETTERS) continue;

			this.availableLetters[character] = getAvailableLetters(Tools.toId(character));
			categoryHintKeys["Characters"].push(character);
		}

		for (const location of Dex.getLocations()) {
			if (location.length < MIN_LETTERS) continue;

			this.availableLetters[location] = getAvailableLetters(Tools.toId(location));
			categoryHintKeys["Locations"].push(location);
		}

		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.name.length < MIN_LETTERS) continue;

			this.availableLetters[pokemon.name] = getAvailableLetters(pokemon.id);
			categoryHintKeys["Pokemon"].push(pokemon.name);
		}

		for (const ability of Games.getAbilitiesList()) {
			if (ability.name.length < MIN_LETTERS) continue;

			this.availableLetters[ability.name] = getAvailableLetters(ability.id);
			categoryHintKeys["Pokemon Abilities"].push(ability.name);
		}

		for (const item of Games.getItemsList()) {
			if (item.name.length < MIN_LETTERS) continue;

			this.availableLetters[item.name] = getAvailableLetters(item.id);
			categoryHintKeys["Pokemon Items"].push(item.name);
		}

		for (const move of Games.getMovesList()) {
			if (move.name.length < MIN_LETTERS) continue;

			this.availableLetters[move.name] = getAvailableLetters(move.id);
			categoryHintKeys["Pokemon Moves"].push(move.name);
		}

		this.cachedData.categoryHintKeys = categoryHintKeys;
	}

	async onSetGeneratedHint(baseHintKey: string): Promise<void> {
		const unavailableLetters = this.sampleMany(LugiasObstructiveLetters.availableLetters[baseHintKey],
			Math.floor(LugiasObstructiveLetters.availableLetters[baseHintKey].length / 2)).sort();
		const answers: string[] = [];
		for (const answer of LugiasObstructiveLetters.cachedData.categoryHintKeys![this.currentCategory]) {
			const id = Tools.toId(answer);
			let hasUnavailableLetter = false;
			for (const letter of unavailableLetters) {
				if (id.includes(letter)) {
					hasUnavailableLetter = true;
					break;
				}
			}

			if (hasUnavailableLetter) continue;

			answers.push(answer);
		}

		if (answers.length > MAX_ANSWERS) {
			await this.generateHint();
			return;
		}

		this.answers = answers;
		this.hint = "<b>" + this.currentCategory + "</b>: <i>" + unavailableLetters.join(", ").toUpperCase() + "</i>";
	}

	getPointsForAnswer(answer: string): number {
		return Tools.toId(answer).length;
	}
}

export const game: IGameFile<LugiasObstructiveLetters> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['lugias', 'lol'],
	category: 'identification-1',
	class: LugiasObstructiveLetters,
	customizableNumberOptions: {
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
