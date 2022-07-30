import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';
import type {
} from '../types/pokemon-showdown';
const minimumMoveAvailability = 6;
const maximumMoveAvailability = 800;

class SilvallysSingleSolutions extends QuestionAndAnswer {
	
	static cachedData: IGameCachedData = {};
	roundTime: number = 5 * 60 *1000;
	hintPrefix: string = "Ralts wants the Pokemon";

	static loadData(): void {
		const includedMoves: string[] = [];
		for (const move of Games.getMovesList()) {
			if (move.id.startsWith('hiddenpower')) continue;

			const availability = Dex.getMoveAvailability(move);
			if (!availability || availability < minimumMoveAvailability || availability > maximumMoveAvailability) continue;
			includedMoves.push(move.id);
		}
		console.log(includedMoves);
		const hintKeys: string[] = [];
		const hints: Dict<string[]> = {};
		var count: number = 0;
		for(const move1 in includedMoves) {

			for(const move2 in includedMoves) {
				if(includedMoves[move1] > includedMoves[move2]) continue;
				if(move1 === move2) continue;
				const PokeList1: string[] = [];
				const PokeList2: string[]  = [];
				for(const pokemon of Games.getPokemonList()){
					const allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
					if(allPossibleMoves.includes(includedMoves[move1])){
						PokeList1.push(pokemon.name);
					}
					if(allPossibleMoves.includes(includedMoves[move2])){
						PokeList2.push(pokemon.name);
					}
				}
				const res = PokeList1.filter(x => PokeList2.includes(x));
				
				if(res.length === 2){
					count += 1;
					console.log(res);
					const a = res.filter(x => x !== 'Smeargle');
					const moves = includedMoves[move1] + ", " + includedMoves[move2] + "!";
					const moves2 = includedMoves[move2] + ", " + includedMoves[move1] + "!";
					console.log(moves, count);
					if(!(a[0] in hints)){
						hints[a[0]]=[];
						hintKeys.push(a[0]);
					}
					hints[a[0]].push(moves);
					hints[a[0]].push(moves2);
				}
			}
		}
		/*
		for (const pokemon of Games.getPokemonList()) {
			if(pokemon.nfe) continue;
			if(!(pokemon.bst==545)) continue;
			if(pokemon.isMega) continue;
			const allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
			const usableMoves: string[] = [];
			for (const move of allPossibleMoves) {
				if (includedMoves.includes(move)) {
					usableMoves.push(move);
				}
			}
			console.log(pokemon.name, usableMoves);
			if (!usableMoves.length) continue;
			for(const move1 in usableMoves) {

				for(const move2 in usableMoves) {
					if(move1 > move2) continue;
					if(move1 === move2) continue;
					const PokeList1: string[] = [];
					const PokeList2: string[]  = [];
					for(const pokemon of Games.getPokemonList()){
						const allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
						if(allPossibleMoves.includes(usableMoves[move1])){
							PokeList1.push(pokemon.name);
						}
						if(allPossibleMoves.includes(usableMoves[move2])){
							PokeList2.push(pokemon.name);
						}
					}
					const res = PokeList1.filter(x => PokeList2.includes(x));
					if(res.length === 2){
						const moves = usableMoves[move1] + ", " + usableMoves[move2];
						console.log(moves);
						if(!(pokemon.name in hints)){
							hints[pokemon.name]=[];
							hintKeys.push(pokemon.name);
						}
						hints[pokemon.name].push(moves);
					}
				}
			}
		}*/
		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;

	}


}

const commands = Tools.deepClone(questionAndAnswerGame.commands!);


export const game: IGameFile<SilvallysSingleSolutions> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['sss1', 'silvallys1'],
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
	name: "Silvallys Single Solutions1",
	mascot: "Silvally",
	minigameCommand: 'ssolution',
	minigameCommandAliases: ['ssolution'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess two moves learned only by the given Pokemon!",
	modes: ["collectiveteam", "multianswer", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
	modeProperties: {
		'survival': {
			roundTime: 8 * 1000,
		},
	},
});
