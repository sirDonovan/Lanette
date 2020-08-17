import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';
import type { IGameFile } from '../types/games';

const name = "Same Solo";
const description = "Every player battles with the same randomly generated Pokemon!";

class SameSolo extends EliminationTournament {
	additionsPerRound = 0;
	evolutionsPerRound = 0;
	startingTeamsLength = 1;
	baseTournamentName = name;
	tournamentDescription = description;
	fullyEvolved = true;
	sharedTeams = true;
	canRejoin = true;
	defaultTier = '1v1';

	getStartingTeam(): string[] {
		return this.pokedex.slice(0, this.startingTeamsLength);
	}
}

export const game: IGameFile<SameSolo> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['ssolo'],
	class: SameSolo,
	description,
	name,
});
