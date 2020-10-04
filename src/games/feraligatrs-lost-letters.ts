import type { Room } from "../rooms";
import type { AchievementsDict, IGameFile } from "../types/games";
import type { User } from "../users";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

const achievements: AchievementsDict = {
	'alphabetsweep': {name: "Alphabet Sweep", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
};

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
	allAnswersAchievement = achievements.alphabetsweep;
	categoryList: DataKey[] = categories.slice();
	roundTime: number = 10 * 1000;

	static loadData(room: Room | User): void {
		data["Characters"] = Dex.data.characters.slice();
		data["Locations"] = Dex.data.locations.slice();
		data["Pokemon"] = Games.getPokemonList().map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList().map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList().map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList().map(x => x.name);
	}

	onSignups(): void {
		super.onSignups();
		if (this.variant === 'inverse') {
			this.roundTime = 15 * 1000;
			this.categoryList.splice(this.categoryList.indexOf('Characters'), 1);
		}
	}

	removeLetters(letters: string[], isInverse: boolean): string {
		const newLetters: string[] = [];
		for (const letter of letters) {
			if (letter === ' ') continue;
			if (isInverse) {
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

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		const isInverse = this.variant === 'inverse';
		let category: DataKey;
		if (this.roundCategory) {
			category = this.roundCategory as DataKey;
		} else if (this.variant && !isInverse) {
			category = this.variant as DataKey;
		} else {
			category = this.sampleOne(this.categoryList);
		}
		let answer: string = '';
		let hint: string = '';
		while (!answer) {
			let name = this.sampleOne(data[category]);
			if (!name || name.endsWith('-Mega')) continue;
			name = name.trim();
			hint = this.removeLetters(name.split(''), isInverse);
			if (hint.length === name.length || Client.willBeFiltered(hint)) continue;
			answer = name;
		}
		this.answers = [answer];
		for (let name of data[category]) {
			name = name.trim();
			if (name === answer) continue;
			if (this.removeLetters(name.split(''), isInverse) === hint) this.answers.push(name);
		}
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
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess the answer after finding the missing vowels!",
	modes: ['team'],
	variants: [
		{
			name: "Feraligatr's Ability Lost Letters",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Feraligatr's Character Lost Letters",
			variant: "Characters",
			variantAliases: ['character'],
		},
		{
			name: "Feraligatr's Inverse Lost Letters",
			description: "Players guess the missing consonants to find the answers!",
			variant: "inverse",
		},
		{
			name: "Feraligatr's Item Lost Letters",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Feraligatr's Location Lost Letters",
			variant: "Locations",
			variantAliases: ['location'],
		},
		{
			name: "Feraligatr's Move Lost Letters",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Feraligatr's Pokemon Lost Letters",
			variant: "Pokemon",
		},
	],
});
