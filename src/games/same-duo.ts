import type { IGameFile } from '../types/games';
import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';

const name = "Same Duo";
const description = "Every player battles with the same randomly generated Pokemon duo!";

class SameDuo extends EliminationTournament {
	activityWarnTimeout = 1 * 60 * 1000;
	firstRoundExtraTime = 2 * 60 * 1000;
	additionsPerRound = 0;
	evolutionsPerRound = 0;
	startingTeamsLength = 2;
	baseTournamentName = name;
	tournamentDescription = description;
	fullyEvolved = true;
	sharedTeams = true;
	canRejoin = true;
	battleFormatId = '2v2 Doubles';

	getStartingTeam(): readonly string[] {
		return this.pokedex.slice(0, this.startingTeamsLength);
	}
}

export const game: IGameFile<SameDuo> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['sduo'],
	class: SameDuo,
	description,
	name,
});
