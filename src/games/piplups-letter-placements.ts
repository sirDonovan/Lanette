import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "swiftplacing";

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

class PiplupsLetterPlacements extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'swiftplacing': {name: "Swift Placing", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};

	allAnswersAchievement = PiplupsLetterPlacements.achievements.swiftplacing;
	lastAnswer: string = '';

	static loadData(): void {
		data["Characters"] = Dex.getCharacters().filter(x => x.length > 3);
		data["Locations"] = Dex.getLocations().filter(x => x.length > 3);
		data["Pokemon"] = Games.getPokemonList(x => x.name.length > 3).map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList(x => x.name.length > 3).map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList(x => x.name.length > 3).map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList(x => x.name.length > 3).map(x => x.name);
	}

	generateAnswer(): void {
		const category = (this.roundCategory || this.sampleOne(categories)) as DataKey;
		let randomAnswer = Tools.toId(this.sampleOne(data[category]));
		while (randomAnswer === this.lastAnswer) {
			randomAnswer = Tools.toId(this.sampleOne(data[category]));
		}
		this.lastAnswer = randomAnswer;

		const startingPosition = this.random(randomAnswer.length - 2);
		const letters = randomAnswer.substr(startingPosition, 3);
		if (Client.checkFilters(letters, this.isPm(this.room) ? undefined : this.room)) {
			this.generateAnswer();
			return;
		}

		const answers: string[] = [];
		for (const answer of data[category]) {
			if (Tools.toId(answer).includes(letters)) answers.push(answer);
		}

		this.answers = answers;
		this.hint = '<b>' + category + '</b>: <i>' + letters + '</i>';
	}
}

export const game: IGameFile<PiplupsLetterPlacements> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["piplups", "plp"],
	category: 'identification',
	class: PiplupsLetterPlacements,
	defaultOptions: ['points'],
	description: "Players guess answers that contain the given letters back-to-back!",
	freejoin: true,
	name: "Piplup's Letter Placements",
	mascot: "Piplup",
	modes: ['multianswer', 'survival', 'team', 'timeattack'],
	minigameCommand: 'placement',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess an answer that contains the given letters " +
		"back-to-back!",
	variants: [
		{
			name: "Piplup's Ability Letter Placements",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Piplup's Character Letter Placements",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Piplup's Item Letter Placements",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Piplup's Location Letter Placements",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Piplup's Move Letter Placements",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Piplup's Pokemon Letter Placements",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
