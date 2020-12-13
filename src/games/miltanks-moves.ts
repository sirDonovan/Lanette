import type { IGameAchievement, IGameFile } from "../types/games";
import type { IMove } from "../types/pokemon-showdown";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "mootronome";

const data: {'moves': Dict<Dict<string[]>>; 'pokemon': string[]} = {
	moves: {},
	pokemon: [],
};

class MiltanksMoves extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'mootronome': {name: "Mootronome", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};

	allAnswersAchievement = MiltanksMoves.achievements.mootronome;

	static loadData(): void {
		const bannedMoves: string[] = [];
		for (const move of Games.getMovesList()) {
			const availability = Dex.getMoveAvailability(move);
			if (availability >= Games.maxMoveAvailability) bannedMoves.push(move.id);
		}

		const moveCache: Dict<IMove> = {};
		const pokedex = Games.getPokemonList(x => x.baseSpecies === x.name);
		for (const pokemon of pokedex) {
			const allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
			for (const possibleMove of allPossibleMoves) {
				if (bannedMoves.includes(possibleMove)) continue;
				if (!(possibleMove in moveCache)) {
					moveCache[possibleMove] = Dex.getExistingMove(possibleMove);
				}
				const move = moveCache[possibleMove];
				if (!(pokemon.name in data.moves)) {
					data.moves[pokemon.name] = {};
					data.pokemon.push(pokemon.name);
				}
				if (!(move.type in data.moves[pokemon.name])) data.moves[pokemon.name][move.type] = [];
				data.moves[pokemon.name][move.type].push(move.name);
			}
		}

		for (const species in data.moves) {
			for (const i in data.moves[species]) {
				if (data.moves[species][i].length > 4) delete data.moves[species][i];
			}

			if (!Object.keys(data.moves[species]).length) {
				delete data.moves[species];
				data.pokemon.splice(data.pokemon.indexOf(species), 1);
			}
		}
	}

	generateAnswer(): void {
		const species = this.sampleOne(data.pokemon);
		const type = this.sampleOne(Object.keys(data.moves[species]));
		this.answers = data.moves[species][type];
		this.hint = "<b>Randomly generated Pokemon and type</b>: <i>" + species + " - " + type + " type</i>";
	}
}

export const game: IGameFile<MiltanksMoves> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['miltanks', 'mm'],
	category: 'knowledge',
	class: MiltanksMoves,
	defaultOptions: ['points'],
	description: "Players guess moves of the specified type that the given Pokemon learn!",
	freejoin: true,
	name: "Miltank's Moves",
	mascot: "Miltank",
	modes: ['multianswer', 'survival', 'team', 'timeattack'],
	nonTrivialLoadData: true,
});
