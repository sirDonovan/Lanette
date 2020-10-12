import type { IGameFile } from '../types/games';
import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';

const name = "Catch and De-volve";
const description = "Every player is given a randomly generated Pokemon to use as their starter. Each battle that you win, you " +
	"must 'catch' 1 of your opponent's Pokemon (add it to your team) and then de-volve 1 Pokemon on your team.";

class CatchAndDevolve extends EliminationTournament {
	additionsPerRound = 1;
	evolutionsPerRound = -1;
	startingTeamsLength = 1;
	maxPlayers = 64;
	requiredAddition = true;
	requiredEvolution = true;
	canReroll = true;
	baseTournamentName = name;
	tournamentDescription = description;
}

export const game: IGameFile<CatchAndDevolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['candde', 'cde', 'catchdevolve'],
	class: CatchAndDevolve,
	description,
	name,
	variants: [
		{
			name: "Monotype Catch and De-volve",
			variant: "monotype",
		},
		{
			name: "Monoregion Catch and De-volve",
			variant: "monoregion",
		},
		{
			name: "Catch and De-volve Ubers",
			variant: "ubers",
		},
		{
			name: "Catch and De-volve UU",
			variant: "uu",
		},
		{
			name: "Catch and De-volve RU",
			variant: "ru",
		},
		{
			name: "Catch and De-volve NU",
			variant: "nu",
		},
		{
			name: "Catch and De-volve PU",
			variant: "pu",
		},
		{
			name: "Catch and De-volve ZU",
			variant: "zu",
		},
	],
});
