import type { IGameFile } from '../types/games';
import type { IPokemon } from '../types/pokemon-showdown';
import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';

const name = "Release and De-volve";
const description = "Every player is given a randomly generated team to start out. Each battle that you win, you " +
	"must 'release' 1 of your Pokemon (remove it from your team) and then de-volve 1 Pokemon on your team.";

class ReleaseAndDevolve extends EliminationTournament {
	canChangeFormat = true;
	dropsPerRound = 1;
	evolutionsPerRound = -1;
	startingTeamsLength = 6;
	maxPlayers = 64;
	requiredDrop = true;
	requiredEvolution = true;
	canReroll = true;
	firstRoundExtraTime = 5 * 60 * 1000;
	baseTournamentName = name;
	tournamentDescription = description;

	meetsStarterCriteria(pokemon: IPokemon): boolean {
		return pokemon.evos.length <= 1;
	}

	meetsEvolutionCriteria(pokemon: IPokemon): boolean {
		return pokemon.evos.length <= 1;
	}
}

export const game: IGameFile<ReleaseAndDevolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['randde', 'rde', 'releasedevolve'],
	class: ReleaseAndDevolve,
	description,
	name,
	variants: [
		{
			name: "Release and De-volve Ubers",
			canChangeFormat: false,
			battleFormatId: "ubers",
			variantAliases: ["ubers", "uber"],
		},
		{
			name: "Release and De-volve UU",
			canChangeFormat: false,
			battleFormatId: "uu",
			variantAliases: ["uu"],
		},
		{
			name: "Release and De-volve RU",
			canChangeFormat: false,
			battleFormatId: "ru",
			variantAliases: ["ru"],
		},
		{
			name: "Release and De-volve NU",
			canChangeFormat: false,
			battleFormatId: "nu",
			variantAliases: ["nu"],
		},
	],
});
