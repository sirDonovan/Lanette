import type { IGameFile } from '../types/games';
import { game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Same Solo";
const description = "Every player battles with the same randomly generated Pokemon!";

class SameSolo extends BattleEliminationTournament {
	canChangeFormat = true;
	additionsPerRound = 0;
	evolutionsPerRound = 0;
	startingTeamsLength = 1;
	baseTournamentName = name;
	tournamentDescription = description;
	fullyEvolved = true;
	sharedTeams = true;
	canRejoin = true;
	battleFormatId = '1v1';

	getStartingTeam(): readonly string[] {
		return this.pokedex.slice(0, this.startingTeamsLength);
	}
}

export const game: IGameFile<SameSolo> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['ssolo'],
	class: SameSolo,
	description,
	name,
});
