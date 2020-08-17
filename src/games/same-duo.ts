import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';
import type { IGameFile } from '../types/games';

const name = "Same Duo";
const description = "Every player battles with the same randomly generated Pokemon duo!";

class SameDuo extends EliminationTournament {
	additionsPerRound = 0;
	evolutionsPerRound = 0;
	startingTeamsLength = 2;
	baseTournamentName = name;
	tournamentDescription = description;
	fullyEvolved = true;
	sharedTeams = true;
	canRejoin = true;
	firstRoundExtraTime = 2 * 60 * 1000;
	defaultTier = '2v2 Doubles';

	getStartingTeam(): string[] {
		return this.pokedex.slice(0, this.startingTeamsLength);
	}
}

export const game: IGameFile<SameDuo> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['sduo'],
	class: SameDuo,
	description,
	name,
});
