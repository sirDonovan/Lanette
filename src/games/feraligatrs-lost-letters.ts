import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "alphabetsweep";

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
const vowels: string[] = ['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U'];

class FeraligatrsLostLetters extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'alphabetsweep': {name: "Alphabet Sweep", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};

	allAnswersAchievement = FeraligatrsLostLetters.achievements.alphabetsweep;
	categoryList: DataKey[] = categories.slice();
	inverseLostLetters: boolean = false;

	static loadData(): void {
		data["Characters"] = Dex.getCharacters().filter(x => x.length > 3);
		data["Locations"] = Dex.getLocations().filter(x => x.length > 3);
		data["Pokemon"] = Games.getPokemonList(x => x.name.length >= 3).map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList(x => x.name.length >= 3).map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList(x => x.name.length >= 3).map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList(x => x.name.length >= 3).map(x => x.name);
	}

	getMinigameDescription(): string {
		return "Use <code>" + Config.commandCharacter + "g</code> to guess the answer after finding the missing " +
			(this.inverseLostLetters ? "consonants" : "vowels") + "!";
	}

	onSignups(): void {
		super.onSignups();
		if (this.inverseLostLetters) {
			this.roundTime = 15 * 1000;
			this.categoryList.splice(this.categoryList.indexOf('Characters'), 1);
		}
	}

	removeLetters(letters: string[]): string {
		const newLetters: string[] = [];
		for (const letter of letters) {
			if (letter === ' ') continue;
			if (this.inverseLostLetters) {
				if (vowels.includes(letter)) {
					newLetters.push(letter);
				}
			} else {
				if (!vowels.includes(letter)) {
					newLetters.push(letter);
				}
			}
		}

		return newLetters.join('');
	}

	generateAnswer(): void {
		let category: DataKey;
		if (this.roundCategory) {
			category = this.roundCategory as DataKey;
		} else {
			category = this.sampleOne(this.categoryList);
		}

		let answer: string = '';
		let hint: string = '';
		while (!answer) {
			let name = this.sampleOne(data[category]);
			if (!name || name.endsWith('-Mega')) continue;
			name = name.trim();
			hint = this.removeLetters(name.split(''));
			if (!hint || hint.length === name.length ||
				Client.checkFilters(hint, !this.isPm(this.room) ? this.room : undefined)) continue;
			answer = name;
		}

		const answers: string[] = [answer];
		for (let name of data[category]) {
			name = name.trim();
			if (name === answer) continue;
			if (this.removeLetters(name.split('')) === hint) answers.push(name);
		}

		this.answers = answers;
		this.hint = '<b>' + category + '</b>: <i>' + hint + '</i>';
	}
}

export const game: IGameFile<FeraligatrsLostLetters> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['feraligatrs', 'fll', 'll'],
	category: 'identification',
	class: FeraligatrsLostLetters,
	defaultOptions: ['points'],
	description: "Players guess the missing vowels to find the answers!",
	formerNames: ["Lost Letters"],
	freejoin: true,
	name: "Feraligatr's Lost Letters",
	mascot: "Feraligatr",
	minigameCommand: 'lostletter',
	minigameCommandAliases: ['lletter'],
	modes: ['team', 'timeattack'],
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
			inverseLostLetters: true,
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
