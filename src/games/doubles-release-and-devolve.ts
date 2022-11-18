import type { IGameFile } from '../types/games';
import type { GameType, IPokemon } from '../types/pokemon-showdown';
import { game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Doubles Release and De-volve";
const description = "Every player is given a randomly generated team to start out. Each battle that you win, you " +
	"must 'release' 2 of your Pokemon (remove them from your team) and then de-volve 2 Pokemon on your team.";

class DoublesReleaseAndDevolve extends BattleEliminationTournament {
	canChangeFormat = true;
	firstRoundExtraTime = 5 * 60 * 1000;
	activityWarnTimeout: number = 5 * 60 * 1000;
	autoDqMinutes: number = 5;
	dropsPerRound = 2;
	evolutionsPerRound = -2;
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

	meetsStarterCriteria(pokemon: IPokemon): boolean {
		return pokemon.evos.length <= 1;
	}

	meetsEvolutionCriteria(pokemon: IPokemon): boolean {
		return pokemon.evos.length <= 1;
	}
}

export const game: IGameFile<DoublesReleaseAndDevolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['doublesrandde', 'doublesrde', 'doublesreleasedevolve', 'drde'],
	class: DoublesReleaseAndDevolve,
	description,
	name,
	variants: [
		{
			name: "Doubles Release and De-volve Ubers",
			canChangeFormat: false,
			battleFormatId: "gen8doublesubers",
			variantAliases: ["ubers", "uber", "doublesubers"],
		},
		{
			name: "Doubles Release and De-volve UU",
			canChangeFormat: false,
			battleFormatId: "gen8doublesuu",
			variantAliases: ["uu", "doublesuu"],
		},
	],
});
