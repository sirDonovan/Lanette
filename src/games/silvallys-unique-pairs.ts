import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "oneofakind" | "captainoneofakind";

class SilvallysUniquePairs extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"oneofakind": {name: "One of a Kind", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
		"captainoneofakind": {name: "Captain One of a Kind", type: 'all-answers-team', bits: 1000, mode: 'collectiveteam', 
			description: "get every answer for your team and win the game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = SilvallysUniquePairs.achievements.oneofakind;
	allAnswersTeamAchievement = SilvallysUniquePairs.achievements.captainoneofakind;
	roundTime: number = 5 * 60 * 1000;
	hintPrefix: string = "Silvally wants a unique pair for";

	static async loadData(): Promise<void> {
		await Games.getWorkers().uniquePairs.initializeThread();
		const threadData = Games.getWorkers().uniquePairs.getThreadData();

		this.cachedData.hintAnswers = threadData.hints;
		this.cachedData.hintKeys = threadData.hintKeys;
	}
}

const commands = Tools.deepClone(questionAndAnswerGame.commands!);

export const game: IGameFile<SilvallysUniquePairs> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['silvallys', 'sup', 'uniquepairs'],
	category: 'puzzle',
	class: SilvallysUniquePairs,
	customizableNumberOptions: {
		points: {min: 5, base: 5, max: 10},
		teamPoints: {min: 10, base: 10, max: 10},
	},
	commandDescriptions: [Config.commandCharacter + "g [move], [move]"],
	commands,
	defaultOptions: ['points'],
	description: "Players try to figure out two moves learned in combination only by the given Pokemon (excluding signature moves)!",
	freejoin: true,
	formerNames: ["Silvally's Single Solutions"],
	name: "Silvally's Unique Pairs",
	mascot: "Silvally",
	minigameCommand: 'uniquepair',
	minigameCommandAliases: ['upair'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess two moves learned in combination only by the " +
		"given Pokemon (excluding signature moves)!",
	modes: ["collectiveteam", "spotlightteam", "survival"],
	nonTrivialLoadData: true,
	modeProperties: {
		'survival': {
			roundTime: 23.5 * 1000,
		},
		'collectiveteam': {
			roundTime: 60 * 1000,
		},
		'spotlightteam': {
			roundTime: 60 * 1000,
		},
	},
});
