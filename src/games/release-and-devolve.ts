import type { IGameFile } from '../types/games';
import type { IPokemon } from '../types/pokemon-showdown';
import { game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Release and De-volve";
const description = "Every player is given a randomly generated team to start out. Each battle that you win, you " +
	"must 'release' 1 of your Pokemon (remove it from your team) and then de-volve 1 Pokemon on your team.";

class ReleaseAndDevolve extends BattleEliminationTournament {
	canChangeFormat = true;
	dropsPerRound = 1;
	evolutionsPerRound = -1;
	startingTeamsLength = 6;
	maxPlayers = 64;
	requiredDrop = true;
	requiredEvolution = true;
	canReroll = true;
	firstRoundExtraTime = 5 * 60 * 1000;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;

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
			battleFormatId: "gen8ubers",
			variantAliases: ["ubers", "uber"],
		},
		{
			name: "Release and De-volve UU",
			canChangeFormat: false,
			battleFormatId: "gen8uu",
			variantAliases: ["uu"],
		},
		{
			name: "Release and De-volve RU",
			canChangeFormat: false,
			battleFormatId: "gen8ru",
			variantAliases: ["ru"],
		},
		{
			name: "Release and De-volve NU",
			canChangeFormat: false,
			battleFormatId: "gen8nu",
			variantAliases: ["nu"],
		},
	],
});
