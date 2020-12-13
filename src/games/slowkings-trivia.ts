import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "knowitall" | "captainknowitall";

const data: {"Pokemon Abilities": Dict<string[]>; "Pokemon Items": Dict<string[]>; "Pokemon Moves": Dict<string[]>} = {
	"Pokemon Abilities": {},
	"Pokemon Items": {},
	"Pokemon Moves": {},
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];
const categoryKeys: KeyedDict<DataKey, string[]> = {
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};

class SlowkingsTrivia extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'knowitall': {name: "Know-It-All", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
		'captainknowitall': {name: "Captain Know-It-All", type: 'all-answers-team', bits: 1000, description: "get every answer for your " +
			"team and win the game"},
	};

	allAnswersAchievement = SlowkingsTrivia.achievements.knowitall;
	allAnswersTeamAchievement = SlowkingsTrivia.achievements.captainknowitall;
	roundTime = 15 * 1000;

	static loadData(): void {
		for (const ability of Games.getAbilitiesList()) {
			const desc = ability.desc || ability.shortDesc;
			if (!desc) continue;
			if (!(desc in data["Pokemon Abilities"])) data["Pokemon Abilities"][desc] = [];
			data["Pokemon Abilities"][desc].push(ability.name);
		}

		for (const item of Games.getItemsList()) {
			const desc = item.desc || item.shortDesc;
			if (!desc) continue;
			if (!(desc in data["Pokemon Items"])) data["Pokemon Items"][desc] = [];
			data["Pokemon Items"][desc].push(item.name);
		}

		for (const move of Games.getMovesList()) {
			const desc = move.desc || move.shortDesc;
			if (!desc) continue;
			if (!(desc in data["Pokemon Moves"])) data["Pokemon Moves"][desc] = [];
			data["Pokemon Moves"][desc].push(move.name);
		}

		for (const category of categories) {
			categoryKeys[category] = Object.keys(data[category]);
		}
	}

	generateAnswer(): void {
		const category = (this.roundCategory || this.sampleOne(categories)) as DataKey;
		const description = this.sampleOne(categoryKeys[category]);
		this.answers = data[category][description];
		this.hint = "<b>" + category + "</b>: <i>" + description + "</i>";
	}
}

export const game: IGameFile<SlowkingsTrivia> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['slowkings', 'triv', 'st'],
	category: 'knowledge',
	class: SlowkingsTrivia,
	defaultOptions: ['points'],
	description: "Players use the given descriptions (Pokemon related) to guess the answers!",
	formerNames: ["Trivia"],
	freejoin: true,
	name: "Slowking's Trivia",
	mascot: "Slowking",
	minigameCommand: 'trivium',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess an answer based on the description!",
	modeProperties: {
		'timeattack': {
			roundTime: 10 * 1000,
		},
	},
	modes: ["survival", "team", "timeattack"],
	variants: [
		{
			name: "Slowking's Ability Trivia",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Slowking's Item Trivia",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Slowking's Move Trivia",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
	],
});
