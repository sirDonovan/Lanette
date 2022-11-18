import type { IGameFile } from '../types/games';
import type { GameType, IPokemon } from '../types/pokemon-showdown';
import { game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Doubles Catch and De-volve";
const description = "Every player is given 2 randomly generated Pokemon to use as their starters. Each battle that you win, you " +
	"must 'catch' 2 of your opponent's Pokemon (add them to your team) and then de-volve 2 Pokemon on your team.";

class DoublesCatchAndEvolve extends BattleEliminationTournament {
	canChangeFormat = true;
	firstRoundExtraTime = 1 * 60 * 1000;
	activityWarnTimeout: number = 5 * 60 * 1000;
	autoDqMinutes: number = 5;
	additionsPerRound = 2;
	evolutionsPerRound = -2;
	startingTeamsLength = 2;
	maxPlayers = 64;
	battleFormatId = 'gen8doublesou';
	battleFormatType: GameType = 'doubles';
	requiredAddition = true;
	requiredEvolution = true;
	canReroll = true;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;

	meetsStarterCriteria(pokemon: IPokemon): boolean {
		return pokemon.evos.length <= 1;
	}

	meetsEvolutionCriteria(pokemon: IPokemon): boolean {
		return pokemon.evos.length <= 1;
	}
}

export const game: IGameFile<DoublesCatchAndEvolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['doublescandde', 'doublescde', 'doublescatchdevolve', 'dcde'],
	class: DoublesCatchAndEvolve,
	description,
	name,
	variants: [
		{
			name: "Monoregion Doubles Catch and De-volve",
			canChangeFormat: false,
			monoRegion: true,
			variantAliases: ["monoregion", "monogen"],
		},
		{
			name: "Doubles Catch and De-volve Ubers",
			canChangeFormat: false,
			battleFormatId: "gen8doublesubers",
			variantAliases: ["ubers", "uber", "doublesubers"],
		},
		{
			name: "Doubles Catch and De-volve UU",
			canChangeFormat: false,
			battleFormatId: "gen8doublesuu",
			variantAliases: ["uu", "doublesuu"],
		},
	],
});
