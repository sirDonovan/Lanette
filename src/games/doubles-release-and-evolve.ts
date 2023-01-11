import type { IGameFile } from '../types/games';
import {
	game as doublesBattleEliminationTournamentGame, DoublesBattleEliminationTournament
} from './templates/doubles-battle-elimination-tournament';

const name = "Doubles Release and Evolve";
const description = "Every player is given a randomly generated team to start out. Each battle that you win, you " +
	"must 'release' 2 of your Pokemon (remove them from your team) and then evolve 2 Pokemon on your team.";

class DoublesReleaseAndEvolve extends DoublesBattleEliminationTournament {
	canChangeFormat = true;
	firstRoundExtraTime = 5 * 60 * 1000;
	dropsPerRound = 2;
	evolutionsPerRound = 2;
	startingTeamsLength = 6;
	maxPlayers = 64;
	minTeamSize = 2;
	requiredDrop = true;
	requiredEvolution = true;
	canReroll = true;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	banlist = ['Burmy', 'Caterpie', 'Combee', 'Kricketot', 'Magikarp', 'Scatterbug', 'Sunkern', 'Tynamo', 'Type: Null', 'Weedle',
		'Wurmple', 'Cosmog', 'Blipbug', 'Snom', 'Wynaut'];
}

export const game: IGameFile<DoublesReleaseAndEvolve> = Games.copyTemplateProperties(doublesBattleEliminationTournamentGame, {
	aliases: ['doublesrande', 'doublesre', 'doublesreleaseevolve', 'dre'],
	class: DoublesReleaseAndEvolve,
	description,
	name,
	variants: [
		{
			name: "Doubles Release and Evolve Ubers",
			canChangeFormat: false,
			battleFormatId: "gen9doublesubers",
			variantAliases: ["ubers", "uber", "doublesubers"],
		},
		{
			name: "Doubles Release and Evolve UU",
			canChangeFormat: false,
			battleFormatId: "gen9doublesuu",
			variantAliases: ["uu", "doublesuu"],
		},
	],
});
