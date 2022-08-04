import type { IGameFile } from '../types/games';
import type { GameType } from '../types/pokemon-showdown';
import {
	game as sameBattleEliminationTournamentGame, SameBattleEliminationTournament
} from './templates/same-battle-elimination-tournament';

const name = "Same Duo";
const description = "Every player battles with the same randomly generated Pokemon duo!";

class SameDuo extends SameBattleEliminationTournament {
	firstRoundExtraTime = 1 * 60 * 1000;
	startingTeamsLength = 2;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	battleFormatId = '2v2 Doubles';
	battleFormatType: GameType = 'doubles';

	getGameCustomRules(): string[] {
		return ["-Focus Sash", "-Ally Switch"];
	}
}

export const game: IGameFile<SameDuo> = Games.copyTemplateProperties(sameBattleEliminationTournamentGame, {
	aliases: ['sduo'],
	class: SameDuo,
	description,
	name,
});
