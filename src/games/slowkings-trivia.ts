import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "knowitall" | "captainknowitall";

class SlowkingsTrivia extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'knowitall': {name: "Know-It-All", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
		'captainknowitall': {name: "Captain Know-It-All", type: 'all-answers-team', bits: 1000, mode: 'collectiveteam',
			description: "get every answer for your team and win the game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = SlowkingsTrivia.achievements.knowitall;
	allAnswersTeamAchievement = SlowkingsTrivia.achievements.captainknowitall;
	roundTime = 15 * 1000;

	static loadData(): void {
		this.cachedData.categories = ["Pokemon Abilities", "Pokemon Items", "Pokemon Moves"];
		const categoryHints: Dict<Dict<string[]>> = {
			"Pokemon Abilities": {},
			"Pokemon Items": {},
			"Pokemon Moves": {},
		};
		const categoryHintKeys: Dict<string[]> = {
			"Pokemon Abilities": [],
			"Pokemon Items": [],
			"Pokemon Moves": [],
		};

		for (const ability of Games.getAbilitiesList()) {
			const desc = ability.desc || ability.shortDesc;
			if (!desc) continue;
			if (!(desc in categoryHints["Pokemon Abilities"])) {
				categoryHints["Pokemon Abilities"][desc] = [];
				categoryHintKeys["Pokemon Abilities"].push(desc);
			}
			categoryHints["Pokemon Abilities"][desc].push(ability.name);
		}

		for (const item of Games.getItemsList()) {
			const desc = item.desc || item.shortDesc;
			if (!desc) continue;
			if (!(desc in categoryHints["Pokemon Items"])) {
				categoryHints["Pokemon Items"][desc] = [];
				categoryHintKeys["Pokemon Items"].push(desc);
			}
			categoryHints["Pokemon Items"][desc].push(item.name);
		}

		for (const move of Games.getMovesList()) {
			const desc = move.desc || move.shortDesc;
			if (!desc) continue;
			if (!(desc in categoryHints["Pokemon Moves"])) {
				categoryHints["Pokemon Moves"][desc] = [];
				categoryHintKeys["Pokemon Moves"].push(desc);
			}
			categoryHints["Pokemon Moves"][desc].push(move.name);
		}

		this.cachedData.categoryHintAnswers = categoryHints;
		this.cachedData.categoryHintKeys = categoryHintKeys;
	}
}

export const game: IGameFile<SlowkingsTrivia> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['slowkings', 'triv'],
	category: 'knowledge-2',
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
		'pmtimeattack': {
			roundTime: 10 * 1000,
		},
	},
	modes: ["collectiveteam", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
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
