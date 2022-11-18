import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

class PorygonsMovesearchMatch extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	hintPrefix: string = "Randomly generated moveset";
	roundTime: number = 20 * 1000;

	static loadData(): void {
		const hints: Dict<string[]> = {};
		const hintKeys: string[] = [];
		const movesets: Dict<string[]> = {};

		for (const pokemon of Games.getPokemonList()) {
			if (!pokemon.randomBattleMoves) continue;
			const key = pokemon.randomBattleMoves.map(x => Tools.toId(x)).sort().join(',');
			if (!(key in movesets)) movesets[key] = [];
			movesets[key].push(pokemon.name);
		}

		for (const key in movesets) {
			const formatted = key.split(',').map(x => Dex.getExistingMove(x).name).join(', ');
			hints[formatted] = movesets[key];
			hintKeys.push(formatted);
		}

		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
	}
}

export const game: IGameFile<PorygonsMovesearchMatch> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['pmm', 'porygons', 'movesearch match'],
	category: 'knowledge-1',
	class: PorygonsMovesearchMatch,
	defaultOptions: ['points'],
	description: "Players guess Pokemon based on the given movesets!",
	disabled: true,
	freejoin: true,
	name: "Porygon's Movesearch Match",
	mascot: "Porygon",
	minigameCommand: 'movesearchmatch',
	minigameCommandAliases: ['mmatch'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a Pokemon with the given moveset!",
	modes: ["collectiveteam", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
	modeProperties: {
		'timeattack': {
			roundTime: 10 * 1000,
		},
		'pmtimeattack': {
			roundTime: 10 * 1000,
		},
	},
});
