import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';
import type {
} from '../types/pokemon-showdown';
const minimumMoveAvailability = 6;

class SilvallysSingleSolutions extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};
	roundTime: number = 5 * 60 * 1000;
	hintPrefix: string = "Silvally wants the Solution to";

	static loadData(): void {
		console.time("silvallys");
		const allPossibleMovesCache: Dict<readonly string[]> = {};
		const pokemonList = Games.getPokemonList(x => {
			if (x.id === 'smeargle') return false;
			const allPossibleMoves = Dex.getAllPossibleMoves(x);
			if (allPossibleMoves.length < 2) return false;
			allPossibleMovesCache[x.name] = allPossibleMoves;
			return true;
		}).slice();
		pokemonList.sort((a, b) => allPossibleMovesCache[b.name].length - allPossibleMovesCache[a.name].length);
		const movePairSingleLearners: Dict<string> = {};
		const invalidPairs: Dict<boolean> = {};
		const moveNames: Dict<string> = {};
		for (const pokemon of pokemonList) {
			const checked: Dict<boolean> = {};
			for (const moveA of allPossibleMovesCache[pokemon.name]) {
				for (const moveB of allPossibleMovesCache[pokemon.name]) {
					if (moveA === moveB) continue;
					const moveAData = Dex.getMove(moveA);
					const moveBData = Dex.getMove(moveB);
					if (!(moveAData === undefined)){
						if (Dex.getMoveAvailability(moveAData) < minimumMoveAvailability) continue;
					}
					if (!(moveBData === undefined)){
						if (Dex.getMoveAvailability(moveBData) < minimumMoveAvailability) continue;
					}
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
		console.timeEnd("silvallys");
		console.log(Object.keys(movePairSingleLearners).length + " possible move pairs");
		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
	}


}

const commands = Tools.deepClone(questionAndAnswerGame.commands!);


export const game: IGameFile<SilvallysSingleSolutions> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['silvallys'],
	category: 'puzzle',
	class: SilvallysSingleSolutions,
	customizableNumberOptions: {
		points: {min: 5, base: 5, max: 10},
		teamPoints: {min: 10, base: 10, max: 10},
	},
	commandDescriptions: [Config.commandCharacter + "g [Move], [Move]"],
	commands,
	defaultOptions: ['points'],
	description: "Players race to figure out two moves learned in combination only by the given Pokemon!",
	freejoin: true,
	name: "Silvallys Single Solutions",
	mascot: "Silvally",
	minigameCommand: 'ssolution',
	minigameCommandAliases: ['ssolution'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess two moves learned only by the given Pokemon!",
	modes: ["collectiveteam", "multianswer", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
	nonTrivialLoadData: true,
	modeProperties: {
		'survival': {
			roundTime: 8 * 1000,
		},
	},
});
