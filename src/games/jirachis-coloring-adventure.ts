import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "rainbowdash" | "captainrainbowdash";

class JirachisColoringAdventure extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"rainbowdash": {name: "Rainbow Dash", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
		"captainrainbowdash": {name: "Captain Rainbow Dash", type: 'all-answers-team', bits: 1000, mode: 'collectiveteam', 
			description: "get every answer for your team and win the game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = JirachisColoringAdventure.achievements.rainbowdash;
	allAnswersTeamAchievement = JirachisColoringAdventure.achievements.captainrainbowdash;
	
	static async loadData(): Promise<void> { // eslint-disable-line @typescript-eslint/require-await
		const hints: Dict<string[]> = {};
		const hintKeys: string[] = [];

		for (const pokemon of Games.getPokemonList()) {
			if (!(pokemon.color in hints)) {
				hints[pokemon.color] = [];
				hintKeys.push(pokemon.color);
			}
			hints[pokemon.color].push(pokemon.name);
		}

		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async onSetGeneratedHint(hintKey: string): Promise<void> {
		this.hint = "<b>Randomly generated color</b>: " + Tools.getTypeOrColorLabel(Tools.getPokemonColorHexCode(hintKey)!, hintKey);
	}
}

export const game: IGameFile<JirachisColoringAdventure> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['jirachis', 'jca'],
	category: 'knowledge-2',
	class: JirachisColoringAdventure,
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	defaultOptions: ['points'],
	description: "Players guess Pokemon that match the given color!",
	freejoin: true,
	name: "Jirachi's Coloring Adventure",
	mascot: "Jirachi",
	minigameCommand: 'coloringadventure',
	minigameCommandAliases: ['cadventure'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a Pokemon that matches the given color!",
	modes: ["collectiveteam", "multianswer", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
});
