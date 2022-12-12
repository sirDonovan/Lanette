import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

class JirachisColoringAdventure extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	static loadData(): void {
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
