import type { IGameFile } from '../types/games';
import type { GameType } from '../types/pokemon-showdown';
import { game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Doubles Release and Evolve";
const description = "Every player is given a randomly generated team to start out. Each battle that you win, you " +
	"must 'release' 2 of your Pokemon (remove them from your team) and then evolve 2 Pokemon on your team.";

class DoublesReleaseAndEvolve extends BattleEliminationTournament {
	canChangeFormat = true;
	firstRoundExtraTime = 5 * 60 * 1000;
	activityWarnTimeout: number = 5 * 60 * 1000;
	autoDqMinutes: number = 5;
	dropsPerRound = 2;
	evolutionsPerRound = 2;
	startingTeamsLength = 6;
	maxPlayers = 64;
	minTeamSize = 2;
	battleFormatId = 'gen8doublesou';
	battleFormatType: GameType = 'doubles';
	requiredDrop = true;
	requiredEvolution = true;
	canReroll = true;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	banlist = ['Burmy', 'Caterpie', 'Combee', 'Kricketot', 'Magikarp', 'Scatterbug', 'Sunkern', 'Tynamo', 'Type: Null', 'Weedle',
		'Wurmple', 'Cosmog', 'Blipbug', 'Snom', 'Wynaut'];
}

export const game: IGameFile<DoublesReleaseAndEvolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['doublesrande', 'doublesre', 'doublesreleaseevolve', 'dre'],
	class: DoublesReleaseAndEvolve,
	description,
	name,
	variants: [
		{
			name: "Doubles Release and Evolve Ubers",
			canChangeFormat: false,
			battleFormatId: "gen8doublesubers",
			variantAliases: ["ubers", "uber", "doublesubers"],
		},
		{
			name: "Doubles Release and Evolve UU",
			canChangeFormat: false,
			battleFormatId: "gen8doublesuu",
			variantAliases: ["uu", "doublesuu"],
		},
	],
});
