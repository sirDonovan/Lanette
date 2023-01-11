import type { IGameFile } from '../types/games';
import type { IPokemon } from '../types/pokemon-showdown';
import {
	game as doublesBattleEliminationTournamentGame, DoublesBattleEliminationTournament
} from './templates/doubles-battle-elimination-tournament';

const name = "Doubles Release and De-volve";
const description = "Every player is given a randomly generated team to start out. Each battle that you win, you " +
	"must 'release' 2 of your Pokemon (remove them from your team) and then de-volve 2 Pokemon on your team.";

class DoublesReleaseAndDevolve extends DoublesBattleEliminationTournament {
	canChangeFormat = true;
	firstRoundExtraTime = 5 * 60 * 1000;
	dropsPerRound = 2;
	evolutionsPerRound = -2;
	startingTeamsLength = 6;
	maxPlayers = 64;
	minTeamSize = 2;
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

export const game: IGameFile<DoublesReleaseAndDevolve> = Games.copyTemplateProperties(doublesBattleEliminationTournamentGame, {
	aliases: ['doublesrandde', 'doublesrde', 'doublesreleasedevolve', 'drde'],
	class: DoublesReleaseAndDevolve,
	description,
	name,
	variants: [
		{
			name: "Doubles Release and De-volve Ubers",
			canChangeFormat: false,
			battleFormatId: "gen9doublesubers",
			variantAliases: ["ubers", "uber", "doublesubers"],
		},
		{
			name: "Doubles Release and De-volve UU",
			canChangeFormat: false,
			battleFormatId: "gen9doublesuu",
			variantAliases: ["uu", "doublesuu"],
		},
	],
});
