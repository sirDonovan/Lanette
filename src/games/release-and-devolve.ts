import type { IGameFile } from '../types/games';
import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';

const name = "Release and De-volve";
const description = "Every player is given a randomly generated team to start out. Each battle that you win, you " +
	"must 'release' 1 of your Pokemon (remove it from your team) and then de-volve 1 Pokemon on your team.";

class ReleaseAndDevolve extends EliminationTournament {
	dropsPerRound = 1;
	evolutionsPerRound = -1;
	startingTeamsLength = 6;
	maxPlayers = 64;
	requiredDrop = true;
	requiredEvolution = true;
	canReroll = true;
	baseTournamentName = name;
	tournamentDescription = description;
}

export const game: IGameFile<ReleaseAndDevolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['randde', 'rde', 'releasedevolve'],
	class: ReleaseAndDevolve,
	description,
	name,
	variants: [
		{
			name: "Release and De-volve Ubers",
			variant: "ubers",
		},
		{
			name: "Release and De-volve UU",
			variant: "uu",
		},
		{
			name: "Release and De-volve RU",
			variant: "ru",
		},
		{
			name: "Release and De-volve NU",
			variant: "nu",
		},
	],
});
