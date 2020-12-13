import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "wordmaster" | "captainwordmaster";

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

class MetangsAnagrams extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'wordmaster': {name: "Wordmaster", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
		'captainwordmaster': {name: "Captain Wordmaster", type: 'all-answers-team', bits: 1000, mode: 'team', description: "get every " +
			"answer for your team and win the game"},
	};

	allAnswersAchievement = MetangsAnagrams.achievements.wordmaster;
	allAnswersTeamAchievement = MetangsAnagrams.achievements.captainwordmaster;
	lastAnswer: string = '';

	static loadData(): void {
		data["Characters"] = Dex.getCharacters().filter(x => x.length >= 3);
		data["Locations"] = Dex.getLocations().filter(x => x.length >= 3);
		data["Pokemon"] = Games.getPokemonList(x => x.name.length >= 3).map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList(x => x.name.length >= 3).map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList(x => x.name.length >= 3).map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList(x => x.name.length >= 3).map(x => x.name);
	}

	generateAnswer(): void {
		const category = (this.roundCategory || this.sampleOne(categories)) as DataKey;
		let answer = this.sampleOne(data[category]);
		while (answer === this.lastAnswer) {
			answer = this.sampleOne(data[category]);
		}
		this.lastAnswer = answer;
		this.answers = [answer];
		const id = Tools.toId(answer);
		const letters = id.split("");
		let hint = this.shuffle(letters);
		while (hint.join("") === id) {
			hint = this.shuffle(letters);
		}
		this.hint = '<b>' + category + '</b>: <i>' + hint.join(", ") + '</i>';
	}
}

export const game: IGameFile<MetangsAnagrams> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['metangs', 'anags', 'ma'],
	category: 'identification',
	class: MetangsAnagrams,
	defaultOptions: ['points'],
	description: "Players unscramble letters to reveal the answers!",
	formerNames: ["Anagrams"],
	freejoin: true,
	name: "Metang's Anagrams",
	mascot: "Metang",
	minigameCommand: 'anagram',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the answer after unscrambling the letters!",
	modes: ["survival", "team", "timeattack"],
	variants: [
		{
			name: "Metangs's Ability Anagrams",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Metangs's Character Anagrams",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Metangs's Item Anagrams",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Metangs's Location Anagrams",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Metangs's Move Anagrams",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Metangs's Pokemon Anagrams",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
