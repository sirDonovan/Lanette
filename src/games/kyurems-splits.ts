import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "splittersplatter";

const data: {'Characters': string[]; 'Locations': string[]; 'Pokemon': string[]; 'Pokemon Abilities': string[];
	'Pokemon Items': string[]; 'Pokemon Moves': string[];} = {
	"Characters": [],
	"Locations": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];

class KyuremsSplits extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'splittersplatter': {name: "Splitter Splatter", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};

	allAnswersAchievement = KyuremsSplits.achievements.splittersplatter;

	static loadData(): void {
		data["Characters"] = Dex.getCharacters().filter(x => x.length >= 3);
		data["Locations"] = Dex.getLocations().filter(x => x.length >= 3);
		data["Pokemon"] = Games.getPokemonList(x => x.name.length >= 3).map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList(x => x.name.length >= 3).map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList(x => x.name.length >= 3).map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList(x => x.name.length >= 3).map(x => x.name);
	}

	isValid(answer: string, hint: string): boolean {
		while (hint.length > 0) {
			const index = answer.indexOf(hint[0]);
			if (index === -1) return false;
			answer = answer.substr(index + 1);
			hint = hint.substr(1);
		}
		return true;
	}

	generateAnswer(): void {
		const category = (this.roundCategory || this.sampleOne(categories)) as DataKey;

		let answers: string[] = [];
		let hint = '';
		while (!answers.length || answers.length > 15 ||
			Client.checkFilters(hint, !this.isPm(this.room) ? this.room : undefined)) {
			const randomAnswer = Tools.toId(this.sampleOne(data[category]));
			const validIndices: number[] = [];
			for (let i = 1; i < randomAnswer.length; i++) {
				validIndices.push(i);
			}
			const numberOfLetters = Math.min(4, Math.max(2, Math.floor(validIndices.length * (Math.random() * 0.4 + 0.3))));
			const chosenIndices = this.sampleMany(validIndices, numberOfLetters);

			hint = '';
			for (const index of chosenIndices) {
				hint += randomAnswer[index];
			}

			answers = [];
			for (const answer of data[category]) {
				if (this.isValid(Tools.toId(answer), hint)) {
					answers.push(answer);
				}
			}
		}

		this.answers = answers;
		this.hint = "<b>" + category + "</b>: <i>" + hint.toUpperCase() + "</i>";
	}
}

export const game: IGameFile<KyuremsSplits> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['kyurems'],
	category: 'identification',
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
	modes: ["survival", "team", "timeattack"],
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
