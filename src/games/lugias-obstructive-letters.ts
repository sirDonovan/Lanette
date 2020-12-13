import type { IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const BASE_POINTS = 50;
const BASE_TEAM_POINTS = 100;

const data: {'Pokemon': Dict<string>; 'Pokemon Abilities': Dict<string>; 'Pokemon Items': Dict<string>; 'Pokemon Moves': Dict<string>} = {
	"Pokemon": {},
	"Pokemon Abilities": {},
	"Pokemon Items": {},
	"Pokemon Moves": {},
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];
const dataKeys: KeyedDict<DataKey, string[]> = {
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};

const letters = Tools.letters.split("");

class LugiasObstructiveLetters extends QuestionAndAnswer {
	loserPointsToBits: number = 2;
	roundTime: number = 30 * 1000;
	winnerPointsToBits: number = 10;

	static loadData(): void {
		const pokemonList = Games.getPokemonList();
		for (const pokemon of pokemonList) {
			data["Pokemon"][pokemon.id] = pokemon.name;
		}

		const abilities = Games.getAbilitiesList();
		for (const ability of abilities) {
			data["Pokemon Abilities"][ability.id] = ability.name;
		}

		const items = Games.getItemsList();
		for (const item of items) {
			data["Pokemon Items"][item.id] = item.name;
		}

		const moves = Games.getMovesList();
		for (const move of moves) {
			data["Pokemon Moves"][move.id] = move.name;
		}

		for (const category of categories) {
			dataKeys[category] = Object.keys(data[category]);
		}
	}

	generateAnswer(): void {
		let answers: string[] = [];
		let category: DataKey;
		let unavailableLetters: string[] = [];
		while (!answers.length || answers.length > 20) {
			category = (this.roundCategory || this.sampleOne(categories)) as DataKey;
			const id = this.sampleOne(dataKeys[category]);
			const availableLetters: string[] = [];
			for (const letter of letters) {
				if (!id.includes(letter)) availableLetters.push(letter);
			}
			unavailableLetters = this.sampleMany(availableLetters, Math.floor(availableLetters.length / 2)).sort();
			answers = [];
			for (const answer of dataKeys[category]) {
				if (answer.length <= 5) continue;
				let hasUnavailableLetter = false;
				for (const letter of unavailableLetters) {
					if (answer.includes(letter)) {
						hasUnavailableLetter = true;
						break;
					}
				}
				if (hasUnavailableLetter) continue;
				answers.push(data[category][answer]);
			}
		}
		this.answers = answers;
		this.hint = "<b>" + category! + "</b>: <i>" + unavailableLetters.map(letter => letter.toUpperCase()).join(", ") + "</i>";
	}

	getPointsForAnswer(answer: string): number {
		return Tools.toId(answer).length;
	}
}

export const game: IGameFile<LugiasObstructiveLetters> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['lugias', 'lol'],
	category: 'identification',
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
	modes: ['survival', 'team'],
});
