import type { IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

class PorygonsMovesearchMatch extends QuestionAndAnswer {
	static data: {hints: Dict<string[]>; hintKeys: string[]} = {
		hints: {},
		hintKeys: [],
	};

	lastMoveset: string = '';
	roundTime: number = 20 * 1000;

	static loadData(): void {
		const movesets: Dict<string[]> = {};
		const pokedex = Games.getPokemonList();
		for (const pokemon of pokedex) {
			if (!pokemon.randomBattleMoves) continue;
			const key = pokemon.randomBattleMoves.map(x => Tools.toId(x)).sort().join(',');
			if (!(key in movesets)) movesets[key] = [];
			movesets[key].push(pokemon.name);
		}

		for (const key in movesets) {
			const formatted = key.split(',').map(x => Dex.getExistingMove(x).name).join(', ');
			this.data.hints[formatted] = movesets[key];
			this.data.hintKeys.push(formatted);
		}
	}

	generateAnswer(): void {
		let moveset = this.sampleOne(PorygonsMovesearchMatch.data.hintKeys);
		while (moveset === this.lastMoveset) {
			moveset = this.sampleOne(PorygonsMovesearchMatch.data.hintKeys);
		}
		this.lastMoveset = moveset;

		this.answers = PorygonsMovesearchMatch.data.hints[moveset];
		this.hint = "<b>Randomly generated moveset</b>: <i>" + moveset + "</i>";
	}
}

export const game: IGameFile<PorygonsMovesearchMatch> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['pmm', 'porygons', 'movesearch match'],
	category: 'knowledge-1',
	class: PorygonsMovesearchMatch,
	defaultOptions: ['points'],
	description: "Players guess Pokemon based on the given movesets!",
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
