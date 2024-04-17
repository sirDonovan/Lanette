import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "proteaneye" | "captainproteaneye";

class GreninjasTypings extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'proteaneye': {name: "Protean Eye", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
		'captainproteaneye': {name: "Captain Protean Eye", type: 'all-answers-team', bits: 1000, mode: 'collectiveteam',
			description: "get every answer for your team and win the game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = GreninjasTypings.achievements.proteaneye;
	allAnswersTeamAchievement = GreninjasTypings.achievements.captainproteaneye;
	hintPrefix: string = "Randomly generated typing";

	static async loadData(): Promise<void> { // eslint-disable-line @typescript-eslint/require-await
		const hints: Dict<string[]> = {};
		const hintKeys: string[] = [];
		const inverseHints: Dict<string[]> = {};

		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.name.startsWith('Arceus-') || pokemon.name.startsWith('Silvally-')) continue;

			const key = pokemon.types.join('/');
			if (!(key in hints)) {
				hints[key] = [];
				hintKeys.push(key);
			}
			hints[key].push(pokemon.name);

			if (pokemon.types.length > 1) {
				const inverseKey = pokemon.types.slice().reverse().join('/');
				if (!(inverseKey in inverseHints)) {
					inverseHints[inverseKey] = [];
				}
				inverseHints[inverseKey].push(pokemon.name);
			}
		}

		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
		this.cachedData.inverseHintAnswers = inverseHints;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async onSetGeneratedHint(hintKey: string): Promise<void> {
		if (this.inverse) {
			this.answers = this.answers.concat(GreninjasTypings.cachedData.hintAnswers![hintKey]);
		}
	}
}

export const game: IGameFile<GreninjasTypings> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['greninjas'],
	category: 'knowledge-1',
	class: GreninjasTypings,
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	defaultOptions: ['points'],
	description: "Players guess Pokemon that match the given typing!",
	freejoin: true,
	formerNames: ['Typings'],
	name: "Greninja's Typings",
	mascot: "Greninja",
	minigameCommand: 'typing',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a Pokemon that matches the given typing!",
	modes: ["abridged", "collectiveteam", "multianswer", "pmtimeattack", "prolix", "spotlightteam", "survival", "timeattack"],
	variants: [
		{
			name: "Greninja's No Order Typings",
			aliases: ['gnot'],
			description: "Players guess Pokemon that match the given typing (order not important)!",
			inverse: true,
			variantAliases: ['no order'],
		},
	],
});
