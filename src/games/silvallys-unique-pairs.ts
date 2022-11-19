import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

class SilvallysUniquePairs extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};
	roundTime: number = 5 * 60 * 1000;
	hintPrefix: string = "Silvally wants a unique pair for";

	static loadData(): void {
		const allPossibleMovesCache: Dict<readonly string[]> = {};
		const pokemonList = Games.getPokemonList({filter: x => {
			if (x.id === 'smeargle') return false;

			const allPossibleMoves = Dex.getAllPossibleMoves(x);
			if (allPossibleMoves.length < 2) return false;

			allPossibleMovesCache[x.name] = allPossibleMoves;
			return true;
		}}).slice();

		pokemonList.sort((a, b) => allPossibleMovesCache[b.name].length - allPossibleMovesCache[a.name].length);

		const bannedMoves: Dict<boolean> = {};
		for (const move of Dex.getMovesList()) {
			if (Dex.isSignatureMove(move)) bannedMoves[move.id] = true;
		}

		const movePairSingleLearners: Dict<string> = {};
		const invalidPairs: Dict<boolean> = {};
		const moveNames: Dict<string> = {};
		for (const pokemon of pokemonList) {
			const checked: Dict<boolean> = {};
			for (const moveA of allPossibleMovesCache[pokemon.name]) {
				if (moveA in bannedMoves) continue;

				for (const moveB of allPossibleMovesCache[pokemon.name]) {
					if (moveA === moveB || moveB in bannedMoves) continue;

					const pair = [moveA, moveB].sort().join(',');
					if (pair in checked) continue;

					checked[pair] = true;

					if (pair in invalidPairs) continue;

					if (pair in movePairSingleLearners) {
						delete movePairSingleLearners[pair];
						invalidPairs[pair] = true;
						continue;
					}

					movePairSingleLearners[pair] = pokemon.name;

					if (!(moveA in moveNames)) moveNames[moveA] = Dex.getMove(moveA)!.name;
					if (!(moveB in moveNames)) moveNames[moveB] = Dex.getMove(moveB)!.name;
				}
			}
		}

		const hintKeys: string[] = [];
		const hints: Dict<string[]> = {};
		for (const pair in movePairSingleLearners) {
			if (!(movePairSingleLearners[pair] in hints)) {
				hints[movePairSingleLearners[pair]] = [];
				hintKeys.push(movePairSingleLearners[pair]);
			}

			const moves = pair.split(',');
			hints[movePairSingleLearners[pair]].push(moveNames[moves[0]] + ' & ' + moveNames[moves[1]]);
			hints[movePairSingleLearners[pair]].push(moveNames[moves[1]] + ' & ' + moveNames[moves[0]]);
		}

		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
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
