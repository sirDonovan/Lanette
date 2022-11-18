import type { IGameFile } from '../types/games';
import type { GameType } from '../types/pokemon-showdown';
import { game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Doubles Catch and Evolve";
const description = "Every player is given 2 randomly generated Pokemon to use as their starters. Each battle that you win, you " +
	"must 'catch' 2 of your opponent's Pokemon (add them to your team) and then evolve 2 Pokemon on your team.";

class DoublesCatchAndEvolve extends BattleEliminationTournament {
	canChangeFormat = true;
	firstRoundExtraTime = 1 * 60 * 1000;
	activityWarnTimeout: number = 5 * 60 * 1000;
	autoDqMinutes: number = 5;
	additionsPerRound = 2;
	evolutionsPerRound = 2;
	startingTeamsLength = 2;
	maxPlayers = 64;
	battleFormatId = 'gen8doublesou';
	battleFormatType: GameType = 'doubles';
	requiredAddition = true;
	requiredEvolution = true;
	canReroll = true;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	banlist = ['Burmy', 'Caterpie', 'Combee', 'Kricketot', 'Magikarp', 'Scatterbug', 'Sunkern', 'Tynamo', 'Type: Null', 'Weedle',
		'Wurmple', 'Cosmog', 'Blipbug', 'Snom', 'Wynaut'];
}

export const game: IGameFile<DoublesCatchAndEvolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['doublescande', 'doublesce', 'doublescatchevolve', 'dce'],
	class: DoublesCatchAndEvolve,
	description,
	name,
	variants: [
		{
			name: "Monoregion Doubles Catch and Evolve",
			canChangeFormat: false,
			monoRegion: true,
			variantAliases: ["monoregion", "monogen"],
		},
		{
			name: "Doubles Catch and Evolve Ubers",
			canChangeFormat: false,
			battleFormatId: "gen8doublesubers",
			variantAliases: ["ubers", "uber", "doublesubers"],
		},
		{
			name: "Doubles Catch and Evolve UU",
			canChangeFormat: false,
			battleFormatId: "gen8doublesuu",
			variantAliases: ["uu", "doublesuu"],
		},
	],
});
