import type { IGameFile } from '../types/games';
import type { GameType } from '../types/pokemon-showdown';
import { BattleElimination, game as eliminationTournamentGame } from './templates/battle-elimination';

const name = "Same Duo";
const description = "Every player battles with the same randomly generated Pokemon duo!";

class SameDuo extends BattleElimination {
	canChangeFormat = true;
	firstRoundExtraTime = 1 * 60 * 1000;
	additionsPerRound = 0;
	evolutionsPerRound = 0;
	startingTeamsLength = 2;
	baseTournamentName = name;
	tournamentDescription = description;
	fullyEvolved = true;
	sharedTeams = true;
	canRejoin = true;
	battleFormatId = '2v2 Doubles';
	battleFormatType: GameType = 'doubles';

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
